import { apiFetch } from './api';
import type { CreatePartyParams, PartySyncResponse, WatchParty, PartyMember } from '../types/party';

const getEffectiveUserId = () => {
  if (typeof window === 'undefined') return 'guest-anon';
  try {
    const userStr = localStorage.getItem('mondoflix_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u.id || u.email) return String(u.id || u.email);
    }
  } catch {}
  let guestId = localStorage.getItem('mondoflix_guest_id');
  if (!guestId) {
    guestId = `guest-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('mondoflix_guest_id', guestId);
  }
  return guestId;
};

export const partyApi = {
  create: (params: CreatePartyParams) => {
    const uid = getEffectiveUserId();
    return apiFetch<{code: string, server_time: number}>('/party', {
      method: 'POST',
      body: JSON.stringify({ ...params, user_id: uid, id: uid }),
    });
  },

  get: (code: string, userId?: string) => {
    const uid = userId || getEffectiveUserId();
    return apiFetch<{party: WatchParty, members: PartyMember[], is_host: boolean, server_time: number}>(
      `/party/${code}${uid ? `?userId=${encodeURIComponent(uid)}` : ''}`
    );
  },

  join: (code: string, memberInfo?: { id?: string; avatar?: string; color?: string; name?: string }) => {
    const uid = memberInfo?.id || getEffectiveUserId();
    return apiFetch<{success: boolean, server_time: number}>(`/party/${code}/join`, { 
      method: 'POST',
      body: JSON.stringify({ ...memberInfo, id: uid, user_id: uid })
    });
  },

  leave: (code: string, userId?: string) => {
    const uid = userId || getEffectiveUserId();
    return apiFetch<{success: boolean, server_time: number}>(`/party/${code}/leave`, { 
      method: 'POST',
      body: JSON.stringify({ user_id: uid })
    });
  },

  end: (code: string, userId?: string) => {
    const uid = userId || getEffectiveUserId();
    return apiFetch<{success: boolean, server_time: number}>(`/party/${code}/end`, { 
      method: 'POST',
      body: JSON.stringify({ user_id: uid })
    });
  },

  updateState: (code: string, state: { 
    is_playing?: boolean; 
    position_seconds?: number; 
    season?: number | null; 
    episode?: number | null; 
    server_key?: string | null;
    media_id?: number | null;
    media_type?: 'movie' | 'tv' | null;
    title?: string | null;
    poster_path?: string | null;
    event_type?: 'play' | 'pause' | 'seek' | 'seeked' | 'server' | 'episode' | 'media_change';
    trigger_user?: string;
  }) =>
    apiFetch<{success: boolean, server_time: number}>(`/party/${code}/state`, {
      method: 'POST',
      body: JSON.stringify(state),
    }),

  updateSettings: (code: string, settings: { only_host_controls?: boolean }) =>
    apiFetch<{success: boolean, party: WatchParty}>(`/party/${code}/settings`, {
      method: 'POST',
      body: JSON.stringify(settings)
    }),

  sync: (code: string, sinceVersion: number, sinceMessageId: number, userId?: string) => {
    const uid = userId || getEffectiveUserId();
    return apiFetch<PartySyncResponse>(
      `/party/${code}/sync?since_version=${sinceVersion}&since_message_id=${sinceMessageId}${uid ? `&userId=${encodeURIComponent(uid)}` : ''}`
    );
  },

  sendMessage: (code: string, body: string, userAvatar?: string, userColor?: string) =>
    apiFetch<{success: boolean, server_time: number}>(`/party/${code}/message`, {
      method: 'POST',
      body: JSON.stringify({ body, user_avatar: userAvatar, user_color: userColor }),
    }),

  sendReaction: (code: string, emoji: string, userAvatar?: string) =>
    apiFetch<{success: boolean, server_time: number}>(`/party/${code}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ emoji, user_avatar: userAvatar }),
    }),

  kick: (code: string, targetUserId: string | number) =>
    apiFetch<{success: boolean, members: PartyMember[]}>(`/party/${code}/kick`, {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    }),

  requestControl: (code: string, requesterInfo?: { id?: string; name?: string; avatar?: string }) =>
    apiFetch<{success: boolean, server_time: number}>(`/party/${code}/request-control`, {
      method: 'POST',
      body: JSON.stringify(requesterInfo || {})
    }),

  respondControl: (code: string, requesterId: string | number, approved: boolean) =>
    apiFetch<{success: boolean, approved: boolean, only_host_controls: boolean}>(`/party/${code}/respond-control`, {
      method: 'POST',
      body: JSON.stringify({ requester_id: requesterId, approved })
    }),

  transferHost: (code: string, newHostId: string | number) =>
    apiFetch<{success: boolean, new_host_id: string | number, new_host_name: string, version: number}>(`/party/${code}/transfer-host`, {
      method: 'POST',
      body: JSON.stringify({ new_host_id: newHostId })
    }),

  getMine: () =>
    apiFetch<{parties: WatchParty[], server_time: number}>('/party/mine'),
};

