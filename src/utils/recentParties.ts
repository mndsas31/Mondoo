import { partyApi } from '../services/partyApi';

export interface RecentPartySession {
  code: string;
  title: string;
  mediaId: number | string;
  mediaType: 'movie' | 'tv';
  season?: number | null;
  episode?: number | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  hostName?: string;
  isHost?: boolean;
  lastJoinedAt: number;
  membersCount?: number;
  isActive?: boolean;
}

const STORAGE_KEY = 'mondoflix_recent_watchparties';
const MAX_SESSIONS = 15;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getRecentParties(): RecentPartySession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: RecentPartySession[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    
    const now = Date.now();
    // Filter expired and invalid items
    return list.filter(item => 
      item && 
      item.code && 
      typeof item.code === 'string' &&
      item.lastJoinedAt && 
      (now - item.lastJoinedAt < MAX_AGE_MS)
    ).sort((a, b) => (b.lastJoinedAt || 0) - (a.lastJoinedAt || 0));
  } catch (err) {
    console.warn('[recentParties] Failed to read from localStorage:', err);
    return [];
  }
}

export function saveRecentParty(session: Omit<RecentPartySession, 'lastJoinedAt'> & { lastJoinedAt?: number }): void {
  try {
    const cleanCode = session.code.trim().toUpperCase();
    if (!cleanCode) return;

    const current = getRecentParties();
    const updated: RecentPartySession = {
      ...session,
      code: cleanCode,
      lastJoinedAt: session.lastJoinedAt || Date.now(),
      title: session.title || 'Watch Party',
      mediaType: session.mediaType || 'movie',
      mediaId: session.mediaId || 1101383,
    };

    // Filter existing session with same code
    const filtered = current.filter(s => s.code !== cleanCode);
    const result = [updated, ...filtered].slice(0, MAX_SESSIONS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    window.dispatchEvent(new CustomEvent('mondoflix:recent_parties_updated'));
  } catch (err) {
    console.warn('[recentParties] Failed to save session:', err);
  }
}

export function removeRecentParty(code: string): void {
  try {
    const cleanCode = code.trim().toUpperCase();
    const current = getRecentParties();
    const result = current.filter(s => s.code !== cleanCode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    window.dispatchEvent(new CustomEvent('mondoflix:recent_parties_updated'));
  } catch (err) {
    console.warn('[recentParties] Failed to remove session:', err);
  }
}

export function clearRecentParties(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('mondoflix:recent_parties_updated'));
  } catch (err) {
    console.warn('[recentParties] Failed to clear sessions:', err);
  }
}

/**
 * Synchronizes local history with server active parties (if available)
 */
export async function syncRecentPartiesWithServer(): Promise<RecentPartySession[]> {
  const localList = getRecentParties();
  try {
    const res = await partyApi.getMine();
    if (res && Array.isArray(res.parties) && res.parties.length > 0) {
      for (const p of res.parties) {
        if (!p.code) continue;
        const exists = localList.find(l => l.code === p.code);
        if (!exists) {
          saveRecentParty({
            code: p.code,
            title: p.title || 'Watch Party',
            mediaId: p.media_id || 1101383,
            mediaType: p.media_type || 'movie',
            season: p.season,
            episode: p.episode,
            posterPath: p.poster_path,
            hostName: p.host_name,
            isHost: true,
            isActive: p.is_active,
            lastJoinedAt: new Date(p.created_at || Date.now()).getTime(),
          });
        }
      }
    }
  } catch {
    // Non-blocking fallback for offline/guest modes
  }
  return getRecentParties();
}
