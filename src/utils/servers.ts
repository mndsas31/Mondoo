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

export const SERVERS: Record<string, ServerConfig> = {
  vidlink: {
    key: 'vidlink',
    label: 'VidLink (Fast)',
    badge: 'Ultra Fast • HD',
    color: 'text-cyan-400 border-cyan-500',
    buildUrl: (args) => {
      const { type, id, season, episode, progress } = normalizeParams(args);
      const params = new URLSearchParams();
      params.set('primaryColor', '00f5ff');
      params.set('secondaryColor', '0f172a');
      params.set('iconColor', '00f5ff');
      params.set('nextEpisode', 'true');
      params.set('autoplay', 'false');
      if (progress && progress > 0) {
        params.set('startTime', Math.floor(progress).toString());
      }
      return type === 'movie'
        ? `https://vidlink.pro/movie/${id}?${params.toString()}`
        : `https://vidlink.pro/tv/${id}/${season || 1}/${episode || 1}?${params.toString()}`;
    },
    supportsProgress: true,
    supportsAutoplay: true,
  },
  vidstuck: {
    key: 'vidstuck',
    label: 'VidStuck',
    badge: '13+ Hosts • HD',
    color: 'text-fuchsia-400 border-fuchsia-500',
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
  },
  vidsrc_cc: {
    key: 'vidsrc_cc',
    label: 'VidSrc v2',
    badge: 'Stable • 1080p',
    color: 'text-emerald-400 border-emerald-500',
    buildUrl: (args) => {
      const { type, id, season, episode } = normalizeParams(args);
      return type === 'movie'
        ? `https://vidsrc.cc/v2/embed/movie/${id}`
        : `https://vidsrc.cc/v2/embed/tv/${id}/${season || 1}/${episode || 1}`;
    },
    supportsProgress: false,
    supportsAutoplay: true,
  },
  embedsu: {
    key: 'embedsu',
    label: 'Embed.su',
    badge: '4K • Direct',
    color: 'text-purple-400 border-purple-500',
    buildUrl: (args) => {
      const { type, id, season, episode } = normalizeParams(args);
      return type === 'movie'
        ? `https://embed.su/embed/movie/${id}`
        : `https://embed.su/embed/tv/${id}/${season || 1}/${episode || 1}`;
    },
    supportsProgress: false,
    supportsAutoplay: true,
  },
  autoembed: {
    key: 'autoembed',
    label: 'AutoEmbed',
    badge: 'Multi-Host',
    color: 'text-amber-400 border-amber-500',
    buildUrl: (args) => {
      const { type, id, season, episode } = normalizeParams(args);
      return type === 'movie'
        ? `https://player.autoembed.cc/embed/movie/${id}`
        : `https://player.autoembed.cc/embed/tv/${id}/${season || 1}/${episode || 1}`;
    },
    supportsProgress: false,
    supportsAutoplay: true,
  },
  vidsrc_to: {
    key: 'vidsrc_to',
    label: 'VidSrc Pro',
    badge: '1080p',
    color: 'text-teal-400 border-teal-500',
    buildUrl: (args) => {
      const { type, id, season, episode } = normalizeParams(args);
      return type === 'movie'
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${season || 1}/${episode || 1}`;
    },
    supportsProgress: false,
    supportsAutoplay: true,
  },
  vidsrc_me: {
    key: 'vidsrc_me',
    label: 'VidSrc ME',
    badge: 'Multi-Sub',
    color: 'text-blue-400 border-blue-500',
    buildUrl: (args) => {
      const { type, id, season, episode } = normalizeParams(args);
      return type === 'movie'
        ? `https://vidsrc.me/embed/movie?tmdb=${id}`
        : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season || 1}&episode=${episode || 1}`;
    },
    supportsProgress: false,
    supportsAutoplay: true,
  },
  vidsrc_in: {
    key: 'vidsrc_in',
    label: 'VidSrc IN',
    badge: 'Mirror',
    color: 'text-emerald-400 border-emerald-500',
    buildUrl: (args) => {
      const { type, id, season, episode } = normalizeParams(args);
      return type === 'movie'
        ? `https://vidsrc.in/embed/movie/${id}`
        : `https://vidsrc.in/embed/tv/${id}/${season || 1}/${episode || 1}`;
    },
    supportsProgress: false,
    supportsAutoplay: true,
  },
  '2embed': {
    key: '2embed',
    label: '2Embed',
    badge: 'Multi-Stream',
    color: 'text-purple-400 border-purple-500',
    buildUrl: (args) => {
      const { type, id, season, episode } = normalizeParams(args);
      return type === 'movie'
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}&s=${season || 1}&e=${episode || 1}`;
    },
    supportsProgress: false,
    supportsAutoplay: false,
  },
  smashystream: {
    key: 'smashystream',
    label: 'SmashyStream',
    badge: 'Backup',
    color: 'text-amber-400 border-amber-500',
    buildUrl: (args) => {
      const { type, id, season, episode } = normalizeParams(args);
      return type === 'movie'
        ? `https://embed.smashystream.com/playere.php?tmdb=${id}`
        : `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${season || 1}&episode=${episode || 1}`;
    },
    supportsProgress: false,
    supportsAutoplay: false,
  },
  streamtape: {
    key: 'streamtape',
    label: 'Streamtape',
    color: 'text-emerald-400 border-emerald-500',
    buildUrl: (args) => {
      const { source } = normalizeParams(args);
      const s = source || '';
      return s.startsWith('http') ? s : `https://streamtape.com/e/${s}`;
    },
    supportsProgress: false,
    supportsAutoplay: false,
  },
  doodstream: {
    key: 'doodstream',
    label: 'Doodstream',
    color: 'text-orange-400 border-orange-500',
    buildUrl: (args) => {
      const { source } = normalizeParams(args);
      const s = source || '';
      return s.startsWith('http') ? s : `https://dood.li/e/${s}`;
    },
    supportsProgress: false,
    supportsAutoplay: false,
  },
  vidcloud: {
    key: 'vidcloud',
    label: 'Vidcloud',
    color: 'text-blue-400 border-blue-500',
    buildUrl: (args) => {
      const { source } = normalizeParams(args);
      const s = source || '';
      return s.startsWith('http') ? s : `https://vidcloud.stream/embed/${s}`;
    },
    supportsProgress: false,
    supportsAutoplay: false,
  },
  mixdrop: {
    key: 'mixdrop',
    label: 'Mixdrop',
    color: 'text-violet-400 border-violet-500',
    buildUrl: (args) => {
      const { source } = normalizeParams(args);
      const s = source || '';
      return s.startsWith('http') ? s : `https://mixdrop.ag/e/${s}`;
    },
    supportsProgress: false,
    supportsAutoplay: false,
  },
  filemoon: {
    key: 'filemoon',
    label: 'Filemoon',
    color: 'text-yellow-400 border-yellow-500',
    buildUrl: (args) => {
      const { source } = normalizeParams(args);
      const s = source || '';
      return s.startsWith('http') ? s : `https://filemoon.sx/e/${s}`;
    },
    supportsProgress: false,
    supportsAutoplay: false,
  },
  upstream: {
    key: 'upstream',
    label: 'Upstream',
    color: 'text-cyan-400 border-cyan-500',
    buildUrl: (args) => {
      const { source } = normalizeParams(args);
      const s = source || '';
      return s.startsWith('http') ? s : `https://upstream.to/embed-${s}.html`;
    },
    supportsProgress: false,
    supportsAutoplay: false,
  },
  vidking: {
    key: 'vidking',
    label: 'Vidking (Legacy)',
    color: 'text-gray-400 border-gray-500',
    buildUrl: (args) => {
      const { type, id, season, episode, progress, retryCount } = normalizeParams(args);
      let url = type === 'movie' 
        ? `https://www.vidking.net/embed/movie/${id}`
        : `https://www.vidking.net/embed/tv/${id}/${season || 1}/${episode || 1}`;
      const params = new URLSearchParams();
      params.set('color', '00f5ff');
      params.set('autoPlay', 'true');
      if (type === 'tv') {
        params.set('nextEpisode', 'true');
        params.set('episodeSelector', 'true');
      }
      if (progress && progress > 5) params.set('progress', Math.floor(progress).toString());
      if (retryCount && retryCount > 0) params.set('_r', retryCount.toString());
      return `${url}?${params.toString()}`;
    },
    supportsProgress: true,
    supportsAutoplay: true,
  }
};
