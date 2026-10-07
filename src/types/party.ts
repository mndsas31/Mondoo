export interface PartyMember {
  id: number | string;
  user_id?: number | string;
  name: string;
  is_host: boolean;
  online: boolean;
  avatar?: string;
  color?: string;
  joined_at?: string;
  last_seen_at?: string;
  status?: 'synced' | 'buffering' | 'desynced' | 'paused' | 'offline';
  position_seconds?: number;
  drift_seconds?: number;
}

export interface PartyMessage {
  id: number;
  user_id: number | string;
  user_name: string;
  user_avatar?: string;
  user_color?: string;
  kind: 'chat' | 'system' | 'reaction';
  body: string;
  created_at: string;
}

export interface PartyState {
  is_playing: boolean;
  position_seconds: number;
  state_updated_at: string;
  season: number | null;
  episode: number | null;
  server_key?: string | null;
  server_time: number;
  media_id?: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  poster_path?: string | null;
  event_type?: 'play' | 'pause' | 'seek' | 'seeked' | 'server' | 'episode' | 'media_change';
  trigger_user?: string;
  only_host_controls?: boolean;
  duration_seconds?: number | null;
}

export interface WatchParty {
  id: number | string;
  code: string;
  host_user_id: number | string;
  host_name?: string;
  media_id: number;
  media_type: 'movie' | 'tv';
  season: number | null;
  episode: number | null;
  title: string;
  poster_path: string | null;
  is_playing: boolean;
  position_seconds: number;
  state_updated_at: string;
  server_key?: string | null;
  version: number;
  is_active: boolean;
  only_host_controls?: boolean;
  created_at: string;
  ended_at: string | null;
  duration_seconds?: number | null;
}

export interface PartySyncResponse {
  unchanged?: boolean;
  version?: number;
  state?: PartyState;
  members: PartyMember[];
  messages?: PartyMessage[];
  server_time: number;
}

export interface CreatePartyParams {
  media_id: number;
  media_type: 'movie' | 'tv';
  season?: number | null;
  episode?: number | null;
  title: string;
  poster_path?: string | null;
  only_host_controls?: boolean;
}

export interface FloatingReactionItem {
  id: string;
  emoji: string;
  userName: string;
  userAvatar?: string;
  xOffset: number;
}
