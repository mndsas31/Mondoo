import { useState, useEffect, useCallback } from 'react';
import { Media } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { useDebounce } from 'use-debounce';

export interface ContinueWatchingItem {
  media: Media;
  media_type?: string;
  progress_seconds: number;
  duration_seconds: number;
  progress?: number;
  duration?: number;
  season?: number;
  episode?: number;
  episode_title?: string;
  last_watched: number; // timestamp
}

export const useContinueWatching = () => {
  const { user, token } = useAuth();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});
  
  // Pending progress to sync to server
  const [pendingProgress, setPendingProgress] = useState<{
    mediaId: number;
    mediaType: string;
    season?: number;
    episode?: number;
    progressSeconds: number;
    durationSeconds: number;
    title?: string;
    posterPath?: string;
    backdropPath?: string;
    overview?: string;
    episodeTitle?: string;
  } | null>(null);

  const [debouncedProgress] = useDebounce(pendingProgress, 2000); // 2s debounce for fast sync

  // Load items from local storage and sync with server
  const loadProgress = useCallback(async () => {
    // 1. Load local storage items
    let localItems: ContinueWatchingItem[] = [];
    try {
      const local = localStorage.getItem('mondoflix_continue_watching');
      localItems = local ? JSON.parse(local) : [];
    } catch {
      localItems = [];
    }
    
    // 2. Fetch from server
    try {
      const serverData = await apiFetch<any[]>('/progress');
      if (Array.isArray(serverData) && serverData.length > 0) {
        const pMap: Record<number, number> = {};
        const serverMergedItems: ContinueWatchingItem[] = [...localItems];

        serverData.forEach((row: any) => {
          const pct = row.duration_seconds > 0 ? (row.progress_seconds / row.duration_seconds) * 100 : 0;
          pMap[row.media_id] = pct;

          // If item is not in local storage or server is newer, merge it
          const existingIdx = serverMergedItems.findIndex(i => i.media.id === row.media_id);
          const serverTime = row.last_watched ? new Date(row.last_watched).getTime() : Date.now();

          const mediaObj: Media = {
            id: row.media_id,
            title: row.title || 'Untitled',
            name: row.title || 'Untitled',
            poster_path: row.poster_path || '',
            backdrop_path: row.backdrop_path || '',
            overview: row.overview || '',
            media_type: row.media_type || 'movie',
            vote_average: 0,
            vote_count: 0,
            popularity: 0,
            genre_ids: []
          };

          const continueItem: ContinueWatchingItem = {
            media: mediaObj,
            media_type: row.media_type,
            progress_seconds: row.progress_seconds || 0,
            duration_seconds: row.duration_seconds || 5400,
            season: row.season,
            episode: row.episode,
            episode_title: row.episode_title,
            last_watched: serverTime
          };

          if (existingIdx >= 0) {
            // Update with latest timestamp/progress if server has more recent progress
            if (serverTime > serverMergedItems[existingIdx].last_watched) {
              serverMergedItems[existingIdx] = {
                ...serverMergedItems[existingIdx],
                progress_seconds: row.progress_seconds,
                duration_seconds: row.duration_seconds || serverMergedItems[existingIdx].duration_seconds,
                season: row.season || serverMergedItems[existingIdx].season,
                episode: row.episode || serverMergedItems[existingIdx].episode,
                last_watched: serverTime
              };
            }
          } else if (pct < 95) {
            serverMergedItems.push(continueItem);
          }
        });

        setProgressMap(prev => ({ ...prev, ...pMap }));
        const sorted = serverMergedItems.sort((a, b) => b.last_watched - a.last_watched).slice(0, 15);
        setItems(sorted);
        try {
          localStorage.setItem('mondoflix_continue_watching', JSON.stringify(sorted));
        } catch {}
        return;
      }
    } catch {
      // Server unreachable, use local
    }

    // Build map from local items
    const pMap: Record<number, number> = {};
    localItems.forEach(item => {
      if (item.duration_seconds > 0) {
        pMap[item.media.id] = (item.progress_seconds / item.duration_seconds) * 100;
      }
    });
    setProgressMap(pMap);
    setItems(localItems.sort((a, b) => b.last_watched - a.last_watched).slice(0, 15));
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress, user, token]);

  // Sync debounced progress to server
  useEffect(() => {
    if (debouncedProgress) {
      apiFetch('/progress', {
        method: 'POST',
        body: JSON.stringify({
          media_id: debouncedProgress.mediaId,
          media_type: debouncedProgress.mediaType,
          season: debouncedProgress.season,
          episode: debouncedProgress.episode,
          progress_seconds: debouncedProgress.progressSeconds,
          duration_seconds: debouncedProgress.durationSeconds,
          title: debouncedProgress.title,
          poster_path: debouncedProgress.posterPath,
          backdrop_path: debouncedProgress.backdropPath,
          overview: debouncedProgress.overview,
          episode_title: debouncedProgress.episodeTitle
        })
      }).catch(() => {});
    }
  }, [debouncedProgress]);

  const updateProgress = (
    media: Media, 
    progressSeconds: number, 
    durationSeconds: number, 
    season?: number, 
    episode?: number,
    episodeTitle?: string
  ) => {
    const percentage = durationSeconds > 0 ? (progressSeconds / durationSeconds) * 100 : 0;
    
    // Update local map instantly for UI updates
    setProgressMap(prev => ({
      ...prev,
      [media.id]: percentage
    }));

    const resolvedMediaType: 'movie' | 'tv' = (media.media_type as 'movie' | 'tv') || ((media as any).first_air_date ? 'tv' : 'movie');
    const title = media.title || media.name || (media as any).original_title || 'Untitled';

    // Save to local storage for instant access
    setItems(prev => {
      const existing = prev.filter(i => i.media.id !== media.id);
      
      // If watched more than 95% of a movie, remove it from continue watching
      if (percentage > 95 && resolvedMediaType !== 'tv') {
        try {
          localStorage.setItem('mondoflix_continue_watching', JSON.stringify(existing));
        } catch {}
        return existing;
      }
      
      const updated: ContinueWatchingItem[] = [
        {
          media: { ...media, media_type: resolvedMediaType },
          media_type: resolvedMediaType,
          progress_seconds: progressSeconds,
          duration_seconds: durationSeconds,
          season,
          episode,
          episode_title: episodeTitle,
          last_watched: Date.now()
        },
        ...existing
      ].slice(0, 15);
      
      try {
        localStorage.setItem('mondoflix_continue_watching', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Queue for server sync
    setPendingProgress({
      mediaId: media.id,
      mediaType: resolvedMediaType,
      season,
      episode,
      progressSeconds,
      durationSeconds,
      title,
      posterPath: media.poster_path,
      backdropPath: media.backdrop_path,
      overview: media.overview,
      episodeTitle
    });
  };

  const advanceToNextEpisode = (
    media: Media,
    nextSeason: number,
    nextEpisode: number,
    nextEpisodeTitle?: string,
    estimatedDuration: number = 2700
  ) => {
    // Instantly set next episode in continue watching with 0 progress
    setProgressMap(prev => ({
      ...prev,
      [media.id]: 0
    }));

    const resolvedMediaType: 'movie' | 'tv' = 'tv';
    const title = media.title || media.name || (media as any).original_title || 'Untitled';

    setItems(prev => {
      const existing = prev.filter(i => i.media.id !== media.id);
      const updated: ContinueWatchingItem[] = [
        {
          media: { ...media, media_type: resolvedMediaType },
          media_type: resolvedMediaType,
          progress_seconds: 0,
          duration_seconds: estimatedDuration,
          season: nextSeason,
          episode: nextEpisode,
          episode_title: nextEpisodeTitle,
          last_watched: Date.now()
        },
        ...existing
      ].slice(0, 15);

      try {
        localStorage.setItem('mondoflix_continue_watching', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setPendingProgress({
      mediaId: media.id,
      mediaType: resolvedMediaType,
      season: nextSeason,
      episode: nextEpisode,
      progressSeconds: 0,
      durationSeconds: estimatedDuration,
      title,
      posterPath: media.poster_path,
      backdropPath: media.backdrop_path,
      overview: media.overview,
      episodeTitle: nextEpisodeTitle
    });
  };

  const removeItem = async (mediaId: number) => {
    // 1. Remove from local state
    setItems(prev => {
      const updated = prev.filter(i => i.media.id !== mediaId);
      try {
        localStorage.setItem('mondoflix_continue_watching', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setProgressMap(prev => {
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });

    // Remove local storage specific keys
    try {
      localStorage.removeItem(`mf_progress:movie:${mediaId}`);
      localStorage.removeItem(`mf_progress:tv:${mediaId}`);
    } catch {}

    // 2. Call server deletion API
    try {
      await apiFetch(`/progress/${mediaId}`, { method: 'DELETE' });
    } catch {}
  };

  const clearAll = async () => {
    setItems([]);
    setProgressMap({});
    try {
      localStorage.removeItem('mondoflix_continue_watching');
    } catch {}

    try {
      await apiFetch('/progress', { method: 'DELETE' });
    } catch {}
  };

  const getProgress = (mediaId: number) => {
    return progressMap[mediaId] || 0;
  };

  return { 
    items, 
    updateProgress, 
    advanceToNextEpisode,
    getProgress, 
    removeItem, 
    clearAll, 
    refresh: loadProgress 
  };
};
