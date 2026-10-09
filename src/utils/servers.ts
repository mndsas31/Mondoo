export interface ServerBuildUrlParams {
  type: string;
  id: number | string;
  season?: number;
  episode?: number;
  progress?: number;
  source?: string;
  retryCount?: number;
}

export interface ServerConfig {
  key: string;
  label: string;
  badge?: string;
  color: string;
  buildUrl: (params: ServerBuildUrlParams | string) => string;
  supportsProgress: boolean;
  supportsAutoplay: boolean;
}

function normalizeParams(params: ServerBuildUrlParams | string): ServerBuildUrlParams {
  if (typeof params === 'string') {
    return { type: 'movie', id: params, source: params };
  }
  return params;
}

const vidstuckConfig: ServerConfig = {
  key: 'vidstuck',
  label: 'VidStuck',
  badge: '13+ Hosts • HD',
  color: 'text-cyan-400 border-cyan-500',
  buildUrl: (args) => {
    const { type, id, season, episode, progress } = normalizeParams(args);
    const params = new URLSearchParams();
    params.set('branding', 'MondoFlix');
    params.set('color', '00f5ff');
    params.set('autoPlay', 'true');
    if (progress && progress > 0) {
      params.set('progress', Math.floor(progress).toString());
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return type === 'movie'
      ? `https://vidstuck.xyz/embed/movie/${id}${query}`
      : `https://vidstuck.xyz/embed/tv/${id}/${season || 1}/${episode || 1}${query}`;
  },
  supportsProgress: true,
  supportsAutoplay: true,
};

const baseServers: Record<string, ServerConfig> = {
  vidstuck: vidstuckConfig,
};

// Safe Proxy so any legacy key lookup (e.g. vidlink, vidsrc_cc, embedsu) safely maps to VidStuck
export const SERVERS: Record<string, ServerConfig> = new Proxy(baseServers, {
  get(target, prop: string | symbol) {
    if (typeof prop === 'string' && prop in target) {
      return (target as any)[prop];
    }
    // Return vidstuck as default fallback for any legacy server key query
    return vidstuckConfig;
  }
});
