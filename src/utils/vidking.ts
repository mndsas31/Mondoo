export const VIDKING_ORIGIN = 'https://www.vidking.net';
export const VIDLINK_ORIGIN = 'https://vidlink.pro';
export const VIDSTUCK_ORIGIN = 'https://vidstuck.xyz';

interface BuildUrlArgs {
  type: string;
  id: string | number;
  season?: string | number;
  episode?: string | number;
  progress?: number;
  retryCount?: number;
}

export const buildVidkingUrl = ({ type, id, season, episode, progress, retryCount }: BuildUrlArgs) => {
  let url = type === 'movie' 
    ? `${VIDKING_ORIGIN}/embed/movie/${id}`
    : `${VIDKING_ORIGIN}/embed/tv/${id}/${season}/${episode}`;
    
  const params = new URLSearchParams();
  params.set('color', '00f5ff');
  params.set('autoPlay', 'true');
  
  if (type === 'tv') {
    params.set('nextEpisode', 'true');
    params.set('episodeSelector', 'true');
  }
  
  if (progress !== undefined && progress > 5) {
    params.set('progress', Math.floor(progress).toString());
  }
  
  if (retryCount && retryCount > 0) {
    params.set('_r', retryCount.toString());
  }
  
  return `${url}?${params.toString()}`;
};

export const parseVidkingMessage = (e: MessageEvent) => {
  const origin = e.origin || '';
  const isAllowedOrigin = 
    origin === VIDKING_ORIGIN || 
    origin === VIDLINK_ORIGIN ||
    origin === VIDSTUCK_ORIGIN ||
    origin.includes('vidlink.pro') ||
    origin.includes('vidstuck') ||
    origin.includes('vidking');

  if (!isAllowedOrigin) return null;
  if (!e.data) return null;
  try {
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg?.type !== 'PLAYER_EVENT') return null;
    return msg.data;
  } catch {
    return null;
  }
};
