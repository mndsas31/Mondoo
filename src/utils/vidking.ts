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

export interface NormalizedPlayerEvent {
  type: 'play' | 'pause' | 'timeupdate' | 'seeked' | 'seeking' | 'ended' | 'buffering' | 'ready' | string;
  event: string;
  currentTime?: number;
  duration?: number;
  [key: string]: any;
}

export const parseVidkingMessage = (e: MessageEvent): NormalizedPlayerEvent | null => {
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
    let msg = e.data;
    if (typeof msg === 'string' && (msg.startsWith('{') || msg.startsWith('['))) {
      msg = JSON.parse(msg);
    }
    if (!msg || typeof msg !== 'object') return null;

    // Schema 1: Standard { type: 'PLAYER_EVENT', data: { ... } }
    if (msg.type === 'PLAYER_EVENT' && msg.data) {
      const inner = msg.data;
      const eventName = (inner.type || inner.event || inner.action || '').toLowerCase();
      const currTime = typeof inner.currentTime === 'number' 
        ? inner.currentTime 
        : (typeof inner.time === 'number' ? inner.time : undefined);
      const dur = typeof inner.duration === 'number' ? inner.duration : undefined;

      return {
        ...inner,
        type: eventName,
        event: eventName,
        currentTime: currTime,
        duration: dur
      };
    }

    // Schema 2: Direct event { event: 'pause' | 'play' | ..., currentTime, duration }
    if (msg.event && typeof msg.event === 'string') {
      const eventName = msg.event.toLowerCase();
      const currTime = typeof msg.currentTime === 'number' 
        ? msg.currentTime 
        : (typeof msg.time === 'number' ? msg.time : undefined);
      const dur = typeof msg.duration === 'number' ? msg.duration : undefined;

      return {
        ...msg,
        type: eventName,
        event: eventName,
        currentTime: currTime,
        duration: dur
      };
    }

    // Schema 3: Direct type { type: 'pause' | 'play' | ..., currentTime, duration }
    if (msg.type && typeof msg.type === 'string') {
      const eventName = msg.type.toLowerCase();
      const currTime = typeof msg.currentTime === 'number' 
        ? msg.currentTime 
        : (typeof msg.time === 'number' ? msg.time : undefined);
      const dur = typeof msg.duration === 'number' ? msg.duration : undefined;

      return {
        ...msg,
        type: eventName,
        event: eventName,
        currentTime: currTime,
        duration: dur
      };
    }

    return null;
  } catch {
    return null;
  }
};
