// src/api/watchParty.ts
// Hardened, production-grade Watch Party API client for React + TypeScript

export interface CreateRoomRequest {
  mediaId: string;
  displayName: string;
  hostOnly: boolean;
  mediaType?: 'movie' | 'tv';
  season?: number | null;
  episode?: number | null;
  title?: string;
  posterPath?: string | null;
}

export interface WatchPartyRoom {
  code: string;
  mediaId: string;
  hostId: string;
  hostOnly: boolean;
  displayName: string;
  server_time?: number;
}

export interface CreateRoomSuccessResponse {
  ok: true;
  room: WatchPartyRoom;
  code?: string;
  server_time?: number;
}

export interface CreateRoomErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}

export type CreateRoomApiResponse = CreateRoomSuccessResponse | CreateRoomErrorResponse;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Robust room creator function.
 * Reads response as text first to cleanly handle HTML 500 pages without throwing JSON parse syntax errors.
 */
export async function createWatchPartyRoom(payload: CreateRoomRequest): Promise<WatchPartyRoom> {
  const token = localStorage.getItem('mondoflix_token');
  const guestId = localStorage.getItem('mondoflix_guest_id');
  const guestName = payload.displayName || localStorage.getItem('mondoflix_guest_name');
  
  const endpoint = `${API_BASE_URL}/party`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (guestId) {
    headers['X-Guest-Id'] = guestId;
  }
  if (guestName) {
    headers['X-Guest-Name'] = encodeURIComponent(guestName);
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mediaId: String(payload.mediaId),
        displayName: payload.displayName || 'Host',
        hostOnly: !!payload.hostOnly,
        // Also provide snake_case compatibility for legacy PHP controllers
        media_id: payload.mediaId,
        media_type: payload.mediaType || 'movie',
        season: payload.season ?? null,
        episode: payload.episode ?? null,
        title: payload.title || 'Watch Party',
        poster_path: payload.posterPath ?? null,
        only_host_controls: !!payload.hostOnly
      }),
    });
  } catch (networkErr: any) {
    throw new Error(`Network failure or blocked request: ${networkErr?.message || 'Check your internet connection'}`);
  }

  // 1. Read response strictly as raw text first
  const rawText = await response.text();

  // 2. Safely attempt JSON parse
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    // Non-JSON response (e.g. PHP fatal error or HTML 500 error page)
    if (import.meta.env.DEV) {
      console.error('[WatchParty API Debug] Server returned non-JSON response:', rawText);
    }
    throw new Error(
      `Server error (${response.status}): Endpoint returned non-JSON output. Check PHP error logs.`
    );
  }

  // 3. Handle non-200 HTTP status codes
  if (!response.ok) {
    const errorMsg = parsed?.error || parsed?.detail || `Server error (${response.status})`;
    throw new Error(errorMsg);
  }

  // 4. Validate API payload contract
  if (parsed?.ok === true && parsed?.room) {
    return parsed.room;
  }

  // Fallback for legacy format { code: 'ABC123', server_time: ... }
  if (parsed?.code) {
    return {
      code: parsed.code,
      mediaId: String(payload.mediaId),
      hostId: 'host',
      hostOnly: !!payload.hostOnly,
      displayName: payload.displayName || 'Host',
      server_time: parsed.server_time
    };
  }

  throw new Error(parsed?.error || 'Invalid room creation response format');
}
