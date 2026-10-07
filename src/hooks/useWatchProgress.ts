import { useEffect, useRef, useState, useCallback } from 'react';
import { useContinueWatching } from './useContinueWatching';
import { Media } from '../types';
import { parseVidkingMessage } from '../utils/vidking';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export const useWatchProgress = (
  mediaId: number,
  mediaType: string,
  eventSeason?: number,
  eventEpisode?: number,
  mediaDetails?: Media | null
) => {
  const { updateProgress, advanceToNextEpisode } = useContinueWatching();
  const { token, user } = useAuth();
  const [initialProgress, setInitialProgress] = useState(0);
  const [currentProgressSeconds, setCurrentProgressSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isNearEnd, setIsNearEnd] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const lastSavedRef = useRef<number>(0);
  const pendingSaveRef = useRef<{ currentTime: number, duration: number } | null>(null);
  const mdRef = useRef<Media | null>(null);
  const hasAutoAdvancedRef = useRef<boolean>(false);

  useEffect(() => {
    mdRef.current = mediaDetails || null;
  }, [mediaDetails]);

  // Reset auto advanced flag on media or episode change
  useEffect(() => {
    hasAutoAdvancedRef.current = false;
    setIsNearEnd(false);
    setIsEnded(false);
  }, [mediaId, mediaType, eventSeason, eventEpisode]);

  useEffect(() => {
    let mounted = true;
    const sKey = `mf_progress:${mediaType}:${mediaId}${mediaType === 'tv' ? `:${eventSeason}:${eventEpisode}` : ''}`;
    const localProg = parseInt(localStorage.getItem(sKey) || '0', 10);
    
    // Set ready immediately with local progress so video player loads instantly
    setInitialProgress(localProg);
    setCurrentProgressSeconds(localProg);
    setIsReady(true);

    const init = async () => {
      if (user && token) {
        try {
          const serverData = await apiFetch('/progress');
          const match = Array.isArray(serverData) ? serverData.find((r: any) => 
            r.media_id === mediaId && 
            r.media_type === mediaType &&
            (mediaType === 'movie' || (r.season === eventSeason && r.episode === eventEpisode))
          ) : null;
          if (match && match.progress_seconds > 0 && mounted) {
            const bestProg = Math.max(localProg, match.progress_seconds);
            setInitialProgress(bestProg);
            setCurrentProgressSeconds(bestProg);
            if (match.duration_seconds > 0) {
              setDurationSeconds(match.duration_seconds);
            }
          }
        } catch (e) {}
      }
    };
    init();
    return () => { mounted = false; };
  }, [mediaId, mediaType, eventSeason, eventEpisode, user, token]);

  const flush = useCallback((forcedTime?: number, forcedDuration?: number) => {
    const md = mdRef.current;
    if (!md) return;

    let currentTime = 0;
    const estimatedDefault = (md as any)?.runtime ? (md as any).runtime * 60 : (mediaType === 'tv' ? 2700 : 5400);
    let duration = estimatedDefault;

    if (forcedTime !== undefined && forcedDuration !== undefined) {
      currentTime = forcedTime;
      duration = forcedDuration > 0 ? forcedDuration : estimatedDefault;
    } else if (pendingSaveRef.current) {
      currentTime = pendingSaveRef.current.currentTime;
      duration = pendingSaveRef.current.duration > 0 ? pendingSaveRef.current.duration : estimatedDefault;
    }

    if (currentTime === 0 && !forcedTime && !pendingSaveRef.current) {
       return; // Don't save 0 if it's not forced
    }
    
    const sKey = `mf_progress:${mediaType}:${mediaId}${mediaType === 'tv' ? `:${eventSeason}:${eventEpisode}` : ''}`;
    localStorage.setItem(sKey, Math.floor(currentTime).toString());

    updateProgress(
      md,
      currentTime,
      duration,
      mediaType === 'tv' ? eventSeason : undefined,
      mediaType === 'tv' ? eventEpisode : undefined
    );
    pendingSaveRef.current = null;
  }, [mediaId, mediaType, eventSeason, eventEpisode, updateProgress]);

  // Method to record progress from direct player event or adapter
  const recordProgress = useCallback((currentTime: number, duration?: number, ended?: boolean) => {
    const md = mdRef.current;
    const estDuration = duration && duration > 0 ? duration : (
      (md as any)?.runtime ? (md as any).runtime * 60 : (mediaType === 'tv' ? 2700 : 5400)
    );

    setCurrentProgressSeconds(currentTime);
    if (estDuration > 0) {
      setDurationSeconds(estDuration);
    }

    pendingSaveRef.current = { currentTime, duration: estDuration };

    // Check if near end (within 45s or > 92% of duration)
    const ratio = estDuration > 0 ? currentTime / estDuration : 0;
    const isClose = (currentTime > 60 && estDuration > 120 && (currentTime >= estDuration - 45 || ratio >= 0.92));
    const hasCompleted = ended || (currentTime > 60 && estDuration > 120 && (currentTime >= estDuration - 10 || ratio >= 0.97));

    if (hasCompleted) {
      setIsEnded(true);
      setIsNearEnd(true);
    } else if (isClose) {
      setIsNearEnd(true);
    }

    const now = Date.now();
    if (ended || now - lastSavedRef.current >= 5000) {
      lastSavedRef.current = now;
      flush(currentTime, estDuration);
    }
  }, [mediaType, flush]);

  // Mark as watched initially so any server immediately shows in continue watching
  useEffect(() => {
    if (isReady && mdRef.current) {
       if (!pendingSaveRef.current) {
         const estDuration = (mdRef.current as any)?.runtime ? (mdRef.current as any).runtime * 60 : (mediaType === 'tv' ? 2700 : 5400);
         flush(Math.max(1, initialProgress), estDuration);
       }
    }
  }, [isReady, flush, initialProgress, mediaType]);

  // Listen to postMessages from various embeds
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // 1. Try VidKing/VidLink message format
      const vidkingData = parseVidkingMessage(e);
      if (vidkingData) {
        const { event, currentTime, duration } = vidkingData;
        if (typeof currentTime === 'number') {
          recordProgress(currentTime, duration, event === 'ended');
          return;
        }
      }

      // 2. Generic JSON payload parsing for custom servers (Embed.su, AutoEmbed, Vimeo, etc.)
      try {
        let msg = e.data;
        if (typeof msg === 'string' && (msg.startsWith('{') || msg.startsWith('['))) {
          msg = JSON.parse(msg);
        }
        if (msg && typeof msg === 'object') {
          const time = typeof msg.currentTime === 'number' ? msg.currentTime : (
            typeof msg.time === 'number' ? msg.time : (
              typeof msg.progress === 'number' ? msg.progress : (
                typeof msg.data?.currentTime === 'number' ? msg.data.currentTime : undefined
              )
            )
          );
          const dur = typeof msg.duration === 'number' ? msg.duration : (
            typeof msg.data?.duration === 'number' ? msg.data.duration : undefined
          );
          const isEndedEvent = msg.event === 'ended' || msg.type === 'ended' || msg.type === 'ENDED' || msg.data?.event === 'ended';

          if (time !== undefined && !isNaN(time) && time > 0) {
            recordProgress(time, dur, isEndedEvent);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      flush();
    };
  }, [recordProgress, flush]);

  return { 
    initialProgress, 
    currentProgressSeconds, 
    durationSeconds, 
    isNearEnd, 
    isEnded, 
    isReady, 
    recordProgress, 
    flush,
    advanceToNextEpisode 
  };
};

