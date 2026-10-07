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

    const defaultSources: MediaSource[] = [
      { id: 0, server_key: 'vidlink', source: 'vidlink', quality: '1080p Fast', language: 'Multi-Sub', priority: 10 },
      { id: 1, server_key: 'vidstuck', source: 'vidstuck', quality: '1080p Multi', language: 'Multi-Sub', priority: 9 },
      { id: 2, server_key: 'vidsrc_cc', source: 'vidsrc_cc', quality: '1080p', language: 'Multi-Sub', priority: 8 },
      { id: 3, server_key: 'embedsu', source: 'embedsu', quality: '4K • HD', language: 'Multi-Sub', priority: 7 },
      { id: 4, server_key: 'autoembed', source: 'autoembed', quality: '1080p', language: 'Multi-Sub', priority: 6 },
      { id: 5, server_key: 'vidsrc_to', source: 'vidsrc_to', quality: '1080p', language: 'English', priority: 5 },
      { id: 6, server_key: 'vidsrc_me', source: 'vidsrc_me', quality: 'Auto', language: 'Multi', priority: 4 },
      { id: 7, server_key: 'vidsrc_in', source: 'vidsrc_in', quality: 'HD', language: 'Multi', priority: 3 },
      { id: 8, server_key: '2embed', source: '2embed', quality: 'HD', language: 'Multi', priority: 2 },
      { id: 9, server_key: 'smashystream', source: 'smashystream', quality: 'HD', language: 'Multi', priority: 1 }
    ];

    sourcesApi.getSources(mediaType, mediaId, season, episode).then(res => {
      if (!mounted) return;
      const dbSources = res.sources || [];
      const allSources = [...defaultSources, ...dbSources];

      setSources(allSources);

      const preferred = localStorage.getItem('mf_preferred_server');
      let selected = allSources[0];

      if (preferred) {
        const found = allSources.find(s => s.server_key === preferred);
        if (found) selected = found;
      }

      setActiveSource(selected);
      setLoading(false);
    }).catch(() => {
      if (mounted) { 
        setSources(defaultSources); 
        setActiveSource(defaultSources[0]); 
        setLoading(false); 
      }
    });

    return () => { mounted = false; };
  }, [mediaType, mediaId, season, episode]);

  const setSource = useCallback((source: MediaSource) => {
    setActiveSource(source);
    localStorage.setItem('mf_preferred_server', source.server_key);
  }, []);

  const nextSource = useCallback(() => {
    if (!activeSource) return;
    const currentIndex = sources.findIndex(s => s.server_key === activeSource.server_key && s.source === activeSource.source);
    if (currentIndex >= 0 && currentIndex < sources.length - 1) setSource(sources[currentIndex + 1]);
    else if (sources.length > 0) setSource(sources[0]);
  }, [activeSource, sources, setSource]);

  return { sources, activeSource, setActiveSource: setSource, loading, nextSource };
}
