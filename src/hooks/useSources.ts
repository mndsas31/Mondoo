import { useState, useEffect, useCallback } from 'react';
import { sourcesApi } from '../services/sourcesApi';
import { SERVERS } from '../utils/servers';

export interface MediaSource {
  id: number;
  server_key: string;
  source: string;
  quality: string | null;
  language: string | null;
  priority: number;
  reports?: number;
  is_active?: boolean;
}

export function useSources(
  mediaType: 'movie' | 'tv', 
  mediaId: number, 
  season?: number, 
  episode?: number
) {
  const [sources, setSources] = useState<MediaSource[]>([]);
  const [activeSource, setActiveSource] = useState<MediaSource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    // Only VidStuck is embedded on the watch player
    const defaultSources: MediaSource[] = [
      { id: 1, server_key: 'vidstuck', source: 'vidstuck', quality: '1080p Multi-Host', language: 'Multi-Sub', priority: 10 }
    ];

    sourcesApi.getSources(mediaType, mediaId, season, episode).then(res => {
      if (!mounted) return;
      // Only retain vidstuck sources
      const dbSources = (res.sources || []).filter(s => s.server_key === 'vidstuck');
      const allSources = dbSources.length > 0 ? dbSources : defaultSources;

      setSources(allSources);
      setActiveSource(allSources[0]);
      localStorage.setItem('mf_preferred_server', 'vidstuck');
      setLoading(false);
    }).catch(() => {
      if (mounted) { 
        setSources(defaultSources); 
        setActiveSource(defaultSources[0]); 
        localStorage.setItem('mf_preferred_server', 'vidstuck');
        setLoading(false); 
      }
    });

    return () => { mounted = false; };
  }, [mediaType, mediaId, season, episode]);

  const setSource = useCallback((source: MediaSource) => {
    setActiveSource(source);
    localStorage.setItem('mf_preferred_server', 'vidstuck');
  }, []);

  const nextSource = useCallback(() => {
    if (!activeSource) return;
    const currentIndex = sources.findIndex(s => s.server_key === activeSource.server_key && s.source === activeSource.source);
    if (currentIndex >= 0 && currentIndex < sources.length - 1) setSource(sources[currentIndex + 1]);
    else if (sources.length > 0) setSource(sources[0]);
  }, [activeSource, sources, setSource]);

  return { sources, activeSource, setActiveSource: setSource, loading, nextSource };
}
