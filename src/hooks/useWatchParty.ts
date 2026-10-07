import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { partyApi } from '../services/partyApi';
import { 
  PartySocketClient, 
  type RoomStatePayload, 
  type PlaybackStatePayload, 
  type ChatMessagePayload, 
  type ReactionPayload 
} from '../services/partySocket';
import type { 
  WatchParty, 
  PartyMember, 
  PartyMessage, 
  PartyState, 
  FloatingReactionItem 
} from '../types/party';
import { 
  getStoredUserAvatar, 
  getStoredUserColor, 
  partySounds 
} from '../utils/partyAvatars';
import { saveRecentParty } from '../utils/recentParties';

/**
 * Retrieves the local user identity (authenticated profile or persistent guest).
 */
export const getUserIdentity = () => {
  if (typeof window === 'undefined') return { id: 'anon', name: 'Guest' };
  
  const storedUserStr = localStorage.getItem('mondoflix_user');
  if (storedUserStr) {
    try {
      const u = JSON.parse(storedUserStr);
      if (u.id || u.email) {
        return {
          id: String(u.id || u.email),
          name: u.username || 'Guest'
        };
      }
    } catch {}
  }
  
  let guestId = localStorage.getItem('mondoflix_guest_id');
  if (!guestId) {
    guestId = `guest-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('mondoflix_guest_id', guestId);
  }
  
  let guestName = localStorage.getItem('mondoflix_guest_name');
  if (!guestName) {
    guestName = `Guest ${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem('mondoflix_guest_name', guestName);
  }
  
  return { id: guestId, name: guestName };
};

/**
 * Hook options and external lifecycle callbacks
 */
export interface UseWatchPartyProps {
  code: string | null;
  onRequestResync?: (seconds: number) => void;
  onNavigateEpisode?: (season: number, episode: number) => void;
  onNavigateMedia?: (mediaType: 'movie' | 'tv', mediaId: number, season?: number | null, episode?: number | null) => void;
  onServerChange?: (serverKey: string) => void;
  onPartyEnded?: (message: string) => void;
}

/**
 * Exposed Media Player State and Interaction Interface
 */
export interface WatchPartyPlayerInterface {
  /** True if the room video playback is currently playing */
  isPlaying: boolean;
  /** Current synchronized position in seconds */
  currentTime: number;
  /** Whether the current user is the room host */
  isHost: boolean;
  /** Whether controls are restricted to the host only */
  onlyHostControls: boolean;
  /** Whether the current user has authority to control playback */
  canControl: boolean;
  /** Calculated playback drift against the host in seconds */
  driftSeconds: number;
  /** Whether the current viewer is within the synchronized threshold (<= 3.0s) */
  isSynced: boolean;
  /** True if the host has paused playback */
  hostPaused: boolean;
  /** Play command - emits playback_command event and synchronizes room */
  play: (currentTime?: number) => void;
  /** Pause command - emits playback_command event and synchronizes room */
  pause: (currentTime?: number) => void;
  /** Seek command - emits playback_command event and requests seek across viewers */
  seek: (targetTime: number) => void;
  /** Immediate resync to expected host position */
  resync: () => void;
  /** Generic player event connector for <video> or iframe players */
  handlePlayerEvent: (event: { type: string; currentTime: number }) => void;
}

export interface ControlRequest {
  requesterId: string | number;
  requesterName: string;
  requesterAvatar?: string;
  ts: number;
}

export function useWatchParty({ 
  code, 
  onRequestResync, 
  onNavigateEpisode, 
  onNavigateMedia, 
  onServerChange, 
  onPartyEnded 
}: UseWatchPartyProps) {
  const [party, setPartyState] = useState<WatchParty | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hostPaused, setHostPaused] = useState(false);
  const [driftSeconds, setDriftSeconds] = useState(0);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [userAvatar, setUserAvatarState] = useState<string>(getStoredUserAvatar);
  const [userColor, setUserColorState] = useState<string>(getStoredUserColor);
  const [onlyHostControls, setOnlyHostControls] = useState<boolean>(true);

  // Control Request feature state
  const [controlRequests, setControlRequests] = useState<ControlRequest[]>([]);
  const [myControlRequestPending, setMyControlRequestPending] = useState(false);
  const [controlFeedback, setControlFeedback] = useState<string | null>(null);

  const avatarRef = useRef(userAvatar);
  const colorRef = useRef(userColor);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  useEffect(() => {
    avatarRef.current = userAvatar;
  }, [userAvatar]);

  useEffect(() => {
    colorRef.current = userColor;
  }, [userColor]);

  const partyRef = useRef<WatchParty | null>(null);
  const onRequestResyncRef = useRef(onRequestResync);
  onRequestResyncRef.current = onRequestResync;
  const onNavigateEpisodeRef = useRef(onNavigateEpisode);
  onNavigateEpisodeRef.current = onNavigateEpisode;
  const onNavigateMediaRef = useRef(onNavigateMedia);
  onNavigateMediaRef.current = onNavigateMedia;
  const onServerChangeRef = useRef(onServerChange);
  onServerChangeRef.current = onServerChange;
  const onPartyEndedRef = useRef(onPartyEnded);
  onPartyEndedRef.current = onPartyEnded;

  const setParty = useCallback((p: WatchParty | null) => {
    partyRef.current = p;
    setPartyState(p);
  }, []);

  const versionRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const clockSkewRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDestroyedRef = useRef(false);
  const stateRef = useRef<PartyState | null>(null);
  const socketRef = useRef<PartySocketClient | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlayerPositionRef = useRef<number>(0);

  /**
   * Computes the calculated host position in seconds with clock skew and elapsed playback time.
   */
  const expectedHostPosition = useCallback(() => {
    if (!stateRef.current) return 0;
    const s = stateRef.current;
    if (!s.is_playing) return s.position_seconds;
    
    let updatedTime = 0;
    if (s.state_updated_at.endsWith('Z')) {
      updatedTime = new Date(s.state_updated_at).getTime();
    } else {
      updatedTime = new Date(s.state_updated_at + 'Z').getTime();
    }
    
    const approxServerTimeNow = Date.now() + clockSkewRef.current;
    const elapsed = Math.max(0, approxServerTimeNow - updatedTime) / 1000;
    return s.position_seconds + elapsed;
  }, []);

  /**
   * Spawns a floating reaction animation and plays synthesized audio.
   */
  const triggerReaction = useCallback((emoji: string, userName: string, avatar?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const xOffset = (Math.random() * 60) - 30; // -30% to +30%
    setFloatingReactions(prev => [...prev.slice(-15), { id, emoji, userName, userAvatar: avatar, xOffset }]);
    partySounds.playReaction();

    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 3200);
  }, []);

  /**
   * Ingests authoritative playback and room state updates.
   */
  const applyStateUpdate = useCallback((newState: PartyState, _triggerUser?: string) => {
    const prevParty = partyRef.current;
    stateRef.current = newState;
    setHostPaused(!newState.is_playing);
    if (newState.only_host_controls !== undefined) {
      setOnlyHostControls(newState.only_host_controls);
    }

    // Keep party state ref synced
    if (prevParty) {
      const updatedParty = {
        ...prevParty,
        ...newState,
        media_id: newState.media_id ?? prevParty.media_id,
        media_type: newState.media_type ?? prevParty.media_type,
        title: newState.title ?? prevParty.title
      };
      setParty(updatedParty);
    }
    
    // If host switched title or season/episode
    if (prevParty && newState.media_id) {
      const isMediaChanged = 
        (newState.media_id !== undefined && Number(newState.media_id) !== Number(prevParty.media_id)) || 
        (newState.media_type && newState.media_type !== prevParty.media_type);

      const isEpisodeChanged = 
        newState.season !== null && newState.season !== undefined &&
        newState.episode !== null && newState.episode !== undefined &&
        (Number(newState.season) !== Number(prevParty.season) || Number(newState.episode) !== Number(prevParty.episode));

      if (isMediaChanged || isEpisodeChanged) {
        onNavigateMediaRef.current?.(
          newState.media_type || 'movie', 
          Number(newState.media_id), 
          newState.season !== undefined && newState.season !== null ? Number(newState.season) : undefined, 
          newState.episode !== undefined && newState.episode !== null ? Number(newState.episode) : undefined
        );
      }
    }

    // If server stream source changed
    if (prevParty && newState.server_key && newState.server_key !== prevParty.server_key) {
      onServerChangeRef.current?.(newState.server_key);
    }

    // Resync playback on explicit seek/seeked/play events
    if (newState.event_type && (
      newState.event_type === 'seek' || 
      newState.event_type === 'seeked' || 
      newState.event_type === 'play'
    )) {
      onRequestResyncRef.current?.(newState.position_seconds);
    }
  }, [setParty]);

  /**
   * Long-poll / REST fallback synchronizer (active when WebSocket is disconnected)
   */
  const sync = useCallback(async () => {
    if (!code || isDestroyedRef.current) return;

    // Skip polling when WebSocket is connected and active
    if (socketRef.current && socketRef.current.isConnected) {
      if (!isDestroyedRef.current) {
        pollingRef.current = setTimeout(sync, 5000);
      }
      return;
    }

    try {
      const identity = getUserIdentity();
      const res = await partyApi.sync(code, versionRef.current, lastMessageIdRef.current, identity.id);
      setIsConnected(true);
      
      if ((res as any)?.ended) {
        sessionStorage.removeItem('active_party_code');
        onPartyEndedRef.current?.((res as any).message || 'Host has ended the watch party.');
        return;
      }

      const serverTimeOffset = res.server_time - Date.now();
      clockSkewRef.current = serverTimeOffset;

      if (res.members) {
        setMembers(res.members);
      }

      if (res.messages && res.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newOnes = res.messages!.filter(m => !existingIds.has(m.id));
          return [...prev, ...newOnes];
        });
        lastMessageIdRef.current = res.messages[res.messages.length - 1].id;
      }

      if (!res.unchanged && res.state) {
        versionRef.current = res.version ?? (versionRef.current + 1);
        applyStateUpdate(res.state);
      }
    } catch (err: any) {
      if (err?.message?.includes('ended') || err?.message?.includes('not found')) {
        sessionStorage.removeItem('active_party_code');
        onPartyEndedRef.current?.('Watch party has ended.');
        return;
      }
    }

    if (!isDestroyedRef.current) {
      const interval = document.visibilityState === 'hidden' ? 6000 : 3000;
      pollingRef.current = setTimeout(sync, interval);
    }
  }, [code, applyStateUpdate]);

  // =========================================================================
  // WebSocket Lifecycle & Event Subscription
  // =========================================================================
  useEffect(() => {
    if (!code) return;

    isDestroyedRef.current = false;
    let joined = false;
    const token = localStorage.getItem('mondoflix_token');
    const identity = getUserIdentity();

    const client = new PartySocketClient();
    socketRef.current = client;

    client.on('open', () => {
      setIsConnected(true);
    });

    client.on('close', () => {
      setIsConnected(false);
    });

    client.on('error', () => {
      setIsConnected(false);
    });

    // Handle incoming standardized room_state
    client.on('room_state', (data: RoomStatePayload) => {
      if (data.settings?.hostOnly !== undefined) {
        setOnlyHostControls(data.settings.hostOnly);
      }
      if (data.members) {
        setMembers(data.members);
      }
      const amIHost = String(data.hostId) === String(identity.id);
      setIsHost(amIHost);

      const now = Date.now();
      const elapsed = data.isPlaying && data.hostUpdatedAt ? Math.max(0, (now - data.hostUpdatedAt) / 1000) : 0;
      const targetTime = (data.hostTime || 0) + elapsed;
      if (stateRef.current) {
        stateRef.current.is_playing = !!data.isPlaying;
        stateRef.current.position_seconds = targetTime;
        if (data.durationSeconds !== undefined && data.durationSeconds !== null) {
          stateRef.current.duration_seconds = data.durationSeconds;
        }
      }
      setHostPaused(!data.isPlaying);
      if (!amIHost && data.isPlaying && targetTime > 0) {
        onRequestResyncRef.current?.(targetTime);
      }

      if (partyRef.current) {
        setParty({
          ...partyRef.current,
          duration_seconds: data.durationSeconds !== undefined ? data.durationSeconds : partyRef.current.duration_seconds,
          server_key: data.serverKey || partyRef.current.server_key
        });
      }

      if (!amIHost && data.serverKey) {
        onServerChangeRef.current?.(data.serverKey);
      }
    });

    // Handle incoming standardized playback_state
    client.on('playback_state', (data: PlaybackStatePayload) => {
      const amIHost = partyRef.current ? String(partyRef.current.host_user_id) === String(identity.id) : false;
      if (!amIHost) {
        const now = Date.now();
        const elapsed = data.isPlaying && data.hostUpdatedAt ? Math.max(0, (now - data.hostUpdatedAt) / 1000) : 0;
        const targetTime = (data.hostTime || 0) + elapsed;

        setHostPaused(!data.isPlaying);
        if (stateRef.current) {
          stateRef.current.is_playing = !!data.isPlaying;
          stateRef.current.position_seconds = targetTime;
          stateRef.current.state_updated_at = new Date(data.hostUpdatedAt || now).toISOString();
        }

        // Automatic video sync: when host pauses or plays or member drifts
        if (!data.isPlaying) {
          onRequestResyncRef.current?.(data.hostTime || 0);
        } else if (data.isPlaying) {
          const currentPos = lastPlayerPositionRef.current || 0;
          const drift = Math.abs(currentPos - targetTime);
          setDriftSeconds(drift);
          if (drift > 1.8) {
            onRequestResyncRef.current?.(targetTime);
          }
        }
      }
    });

    client.on('party:state', (data) => {
      if (data.state) {
        applyStateUpdate(data.state, data.trigger_user);
      }
    });

    client.on('chat_message', (data: ChatMessagePayload) => {
      if (data.text) {
        const newMsg: PartyMessage = {
          id: data.ts || Date.now(),
          user_id: data.user?.id || 'guest',
          user_name: data.user?.name || 'Guest',
          user_avatar: data.user?.avatar || '🍿',
          kind: 'chat',
          body: data.text,
          created_at: new Date(data.ts || Date.now()).toISOString()
        };
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id && m.body === newMsg.body)) return prev;
          return [...prev, newMsg];
        });
        lastMessageIdRef.current = newMsg.id;
        partySounds.playMessage();
      }
    });

    client.on('party:message', (data) => {
      if (data.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        lastMessageIdRef.current = data.message.id;
        if (data.message.kind === 'chat') {
          partySounds.playMessage();
        }
      }
    });

    client.on('reaction', (data: ReactionPayload) => {
      triggerReaction(data.emoji, data.user?.name || 'Guest', data.user?.avatar);
    });

    client.on('party:reaction', (data) => {
      triggerReaction(data.emoji, data.user_name, data.user_avatar);
    });

    client.on('party:members', (data) => {
      if (data.members) {
        setMembers(data.members);
        const myMember = data.members.find(m => String(m.user_id || m.id) === String(identity.id));
        if (myMember && myMember.is_host !== undefined) {
          setIsHost(myMember.is_host);
        }
      }
      if (data.event === 'join') {
        partySounds.playJoin();
      }
    });

    client.on('host_changed', (data) => {
      const amINewHost = String(data.newHostId) === String(identity.id);
      setIsHost(amINewHost);
      if (partyRef.current) {
        setParty({ ...partyRef.current, host_user_id: data.newHostId, host_name: data.newHostName });
      }
      if (data.members) {
        setMembers(data.members);
      }
      partySounds.playJoin();
    });

    client.on('party:host_transferred', (data) => {
      const amINewHost = String(data.new_host_id) === String(identity.id);
      setIsHost(amINewHost);
      if (partyRef.current) {
        setParty({ ...partyRef.current, host_user_id: data.new_host_id, host_name: data.new_host_name });
      }
      partySounds.playJoin();
    });

    client.on('party:members_update', (data) => {
      if (data.members) {
        setMembers(data.members);
        const myMember = data.members.find(m => String(m.user_id || m.id) === String(identity.id));
        if (myMember && myMember.is_host !== undefined) {
          setIsHost(myMember.is_host);
        }
      }
    });

    client.on('party:settings', (data) => {
      if (data.only_host_controls !== undefined) {
        setOnlyHostControls(data.only_host_controls);
      }
    });

    client.on('party:typing', (data) => {
      if (data.user_name) {
        setTypingUsers(prev => Array.from(new Set([...prev, data.user_name])));
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== data.user_name));
        }, 2500);
      }
    });

    client.on('kicked', () => {
      sessionStorage.removeItem('active_party_code');
      setError('You were removed from the watch party by the host.');
      onPartyEndedRef.current?.('You were removed from the watch party by the host.');
    });

    client.on('party:ended', (data) => {
      sessionStorage.removeItem('active_party_code');
      onPartyEndedRef.current?.(data.message || 'Host has ended the watch party.');
    });

    client.on('init', (data) => {
      if (data.party) {
        setParty(data.party);
        const amIHost = String(data.party.host_user_id) === String(identity.id);
        setIsHost(amIHost);
        setOnlyHostControls(data.party.only_host_controls ?? true);
        setHostPaused(!data.party.is_playing);
        stateRef.current = {
          is_playing: data.party.is_playing,
          position_seconds: data.party.position_seconds,
          state_updated_at: data.party.state_updated_at,
          season: data.party.season,
          episode: data.party.episode,
          server_key: data.party.server_key,
          only_host_controls: data.party.only_host_controls,
          server_time: data.server_time || Date.now()
        };
      }
      if (data.members) setMembers(data.members);
      if (data.messages) {
        setMessages(data.messages);
        if (data.messages.length > 0) {
          lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
        }
      }
      if (data.server_time) {
        clockSkewRef.current = data.server_time - Date.now();
      }
    });

    client.on('control_requested', (data) => {
      const amIHost = isHostRef.current || (partyRef.current ? String(partyRef.current.host_user_id) === String(identity.id) : false);
      if (amIHost) {
        setControlRequests(prev => {
          if (prev.some(r => String(r.requesterId) === String(data.requesterId))) return prev;
          return [...prev, {
            requesterId: String(data.requesterId),
            requesterName: data.requesterName,
            requesterAvatar: data.requesterAvatar,
            ts: data.ts || Date.now()
          }];
        });
        partySounds.playMessage();
      }
    });

    client.on('control_granted', (data) => {
      setControlRequests(prev => prev.filter(r => String(r.requesterId) !== String(data.requesterId)));
      setOnlyHostControls(false);
      if (String(data.requesterId) === String(identity.id)) {
        setMyControlRequestPending(false);
        setControlFeedback('🎉 Control Granted! You can now control player playback.');
        partySounds.playJoin();
        setTimeout(() => setControlFeedback(null), 5000);
      }
    });

    client.on('control_declined', (data) => {
      setControlRequests(prev => prev.filter(r => String(r.requesterId) !== String(data.requesterId)));
      if (String(data.requesterId) === String(identity.id)) {
        setMyControlRequestPending(false);
        setControlFeedback('Host kept playback controls set to Host Only.');
        setTimeout(() => setControlFeedback(null), 4000);
      }
    });

    const init = async () => {
      try {
        const initData = await partyApi.get(code, identity.id);
        setError(null);
        setParty(initData.party);
        const amIHost = initData.is_host || (initData.party ? String(initData.party.host_user_id) === String(identity.id) : false);
        setIsHost(amIHost);
        setOnlyHostControls(initData.party.only_host_controls ?? true);
        setHostPaused(!initData.party.is_playing);

        // Record in Recently Viewed watch parties
        saveRecentParty({
          code: initData.party.code,
          title: initData.party.title || 'Watch Party',
          mediaId: initData.party.media_id,
          mediaType: (initData.party.media_type as 'movie' | 'tv') || 'movie',
          season: initData.party.season,
          episode: initData.party.episode,
          posterPath: initData.party.poster_path,
          hostName: initData.party.host_name,
          isHost: initData.is_host,
          isActive: initData.party.is_active,
          lastJoinedAt: Date.now()
        });
        
        let initialMembers = initData.members || [];
        const selfMember: PartyMember = {
          id: identity.id,
          user_id: identity.id,
          name: identity.name,
          avatar: avatarRef.current,
          color: colorRef.current,
          is_host: initData.is_host,
          online: true,
          joined_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        };
        if (!initialMembers.some(m => String(m.user_id || m.id) === String(identity.id))) {
          initialMembers = [selfMember, ...initialMembers];
        }
        setMembers(initialMembers);

        clockSkewRef.current = initData.server_time - Date.now();
        versionRef.current = initData.party.version;
        stateRef.current = {
          is_playing: initData.party.is_playing,
          position_seconds: initData.party.position_seconds,
          state_updated_at: initData.party.state_updated_at,
          season: initData.party.season,
          episode: initData.party.episode,
          server_key: initData.party.server_key,
          server_time: initData.server_time,
          only_host_controls: initData.party.only_host_controls
        };

        if (!amIHost && initData.party.position_seconds !== undefined) {
          const now = Date.now();
          const updatedAt = initData.party.state_updated_at ? new Date(initData.party.state_updated_at).getTime() : now;
          const elapsed = initData.party.is_playing ? Math.max(0, (now - updatedAt) / 1000) : 0;
          const exactPos = (initData.party.position_seconds || 0) + elapsed;
          if (exactPos > 0) {
            onRequestResyncRef.current?.(exactPos);
          }
        }

        try {
          await partyApi.join(code, {
            id: identity.id,
            avatar: avatarRef.current,
            color: colorRef.current,
            name: identity.name
          });
          joined = true;
        } catch (joinErr) {
          console.warn('[WatchParty] HTTP join notice:', joinErr);
        }

        // Establish WebSocket connection
        client.connect({
          code,
          userId: identity.id,
          username: identity.name,
          avatar: avatarRef.current,
          color: colorRef.current,
          token
        });
        
        // Start polling fallback
        sync();
      } catch (err: any) {
        console.error('[WatchParty] Init error:', err);
        setError(err.message || 'Failed to join party');
        // Still attempt socket connect & polling
        client.connect({
          code,
          userId: identity.id,
          username: identity.name,
          avatar: avatarRef.current,
          color: colorRef.current,
          token
        });
        sync();
      }
    };

    init();

    const handleBeforeUnload = () => {
      if (joined && code) {
        partyApi.leave(code).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isDestroyedRef.current = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
      client.disconnect();
      socketRef.current = null;
      if (joined && code) {
        partyApi.leave(code).catch(() => {});
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [code, applyStateUpdate, sync, triggerReaction, setParty]);

  // =========================================================================
  // Heartbeat Logic for Playback Synchronization & Drift Compensation
  // =========================================================================
  useEffect(() => {
    if (!isHost || !code || !socketRef.current) return;
    
    socketRef.current.startHeartbeat(() => ({
      hostTime: lastPlayerPositionRef.current || stateRef.current?.position_seconds || 0,
      isPlaying: stateRef.current ? stateRef.current.is_playing : true
    }), 2500);

    return () => {
      socketRef.current?.stopHeartbeat();
    };
  }, [isHost, code]);

  // =========================================================================
  // Player Interaction & State Publishing
  // =========================================================================
  const lastPublishRef = useRef<number>(0);

  const publishState = useCallback((
    isPlaying: boolean, 
    position: number, 
    force = false, 
    season?: number | null, 
    episode?: number | null, 
    serverKey?: string | null,
    eventType?: 'play' | 'pause' | 'seek' | 'server' | 'episode' | 'media_change',
    mediaId?: number | null,
    mediaType?: 'movie' | 'tv' | null,
    title?: string | null,
    posterPath?: string | null,
    durationSeconds?: number | null
  ) => {
    if (onlyHostControls && !isHost) return;
    if (!code) return;

    const now = Date.now();
    if (!force && now - lastPublishRef.current < 1800) return;
    lastPublishRef.current = now;
    lastPlayerPositionRef.current = position;

    if (stateRef.current) {
      stateRef.current.is_playing = isPlaying;
      stateRef.current.position_seconds = position;
      if (durationSeconds !== undefined && durationSeconds !== null) {
        stateRef.current.duration_seconds = durationSeconds;
      }
    }

    const statePayload = {
      is_playing: isPlaying,
      position_seconds: position,
      season,
      episode,
      server_key: serverKey,
      event_type: eventType || (isPlaying ? 'play' : 'pause'),
      duration_seconds: durationSeconds,
      ...(mediaId ? { media_id: mediaId, media_type: mediaType || 'movie', title, poster_path: posterPath } : {})
    };

    // Emit standardized playback_command event over WebSocket
    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.sendPlaybackCommand(
        eventType === 'seek' ? 'seek' : (isPlaying ? 'play' : 'pause'),
        position
      );

      socketRef.current.send({
        type: 'state_update',
        state: statePayload
      });
    }

    // Persist via API
    partyApi.updateState(code, statePayload).catch(console.error);
  }, [onlyHostControls, isHost, code]);

  /**
   * Explicit Player Control Commands
   */
  const play = useCallback((currentTime?: number) => {
    if (onlyHostControls && !isHost) return;
    const pos = currentTime !== undefined ? currentTime : (lastPlayerPositionRef.current || expectedHostPosition());
    publishState(true, pos, true, partyRef.current?.season, partyRef.current?.episode, partyRef.current?.server_key, 'play');
  }, [publishState, expectedHostPosition, onlyHostControls, isHost]);

  const pause = useCallback((currentTime?: number) => {
    if (onlyHostControls && !isHost) return;
    const pos = currentTime !== undefined ? currentTime : (lastPlayerPositionRef.current || expectedHostPosition());
    publishState(false, pos, true, partyRef.current?.season, partyRef.current?.episode, partyRef.current?.server_key, 'pause');
  }, [publishState, expectedHostPosition, onlyHostControls, isHost]);

  const togglePause = useCallback((currentTime?: number) => {
    if (onlyHostControls && !isHost) return;
    const pos = currentTime !== undefined ? currentTime : (lastPlayerPositionRef.current || expectedHostPosition());
    if (hostPaused) {
      play(pos);
    } else {
      pause(pos);
    }
  }, [onlyHostControls, isHost, hostPaused, expectedHostPosition, play, pause]);

  const seek = useCallback((targetTime: number) => {
    if (onlyHostControls && !isHost) return;
    const isPlaying = stateRef.current?.is_playing ?? true;
    publishState(isPlaying, targetTime, true, partyRef.current?.season, partyRef.current?.episode, partyRef.current?.server_key, 'seek');
  }, [publishState, onlyHostControls, isHost]);

  const resync = useCallback(() => {
    const target = expectedHostPosition();
    onRequestResyncRef.current?.(target);
  }, [expectedHostPosition]);

  const checkDrift = useCallback((currentPosition: number) => {
    lastPlayerPositionRef.current = currentPosition;
    if (!stateRef.current) return;
    const expected = expectedHostPosition();
    const drift = Math.abs(currentPosition - expected);
    setDriftSeconds(drift);

    // Tight screen sync: if drift exceeds threshold, automatically resync
    const threshold = onlyHostControls ? 1.8 : 2.5;
    if (drift > threshold && stateRef.current.is_playing) {
      onRequestResyncRef.current?.(expected);
    }
  }, [expectedHostPosition, onlyHostControls]);

  const lastMemberStatusRef = useRef<string>('');
  const lastStatusSentAtRef = useRef<number>(0);

  const sendMemberStatus = useCallback((status: 'synced' | 'buffering' | 'desynced' | 'paused', positionSeconds?: number, driftSecs?: number) => {
    const now = Date.now();
    const roundedPos = Math.round(positionSeconds || 0);
    const roundedDrift = Math.round(driftSecs || 0);
    const statusKey = `${status}:${roundedPos}:${roundedDrift}`;

    if (statusKey === lastMemberStatusRef.current && now - lastStatusSentAtRef.current < 3000) {
      return;
    }
    lastMemberStatusRef.current = statusKey;
    lastStatusSentAtRef.current = now;

    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.sendMemberStatus(status, positionSeconds, driftSecs);
    }
  }, []);

  const handlePlayerEvent = useCallback((event: { type: string; currentTime: number }) => {
    lastPlayerPositionRef.current = event.currentTime;
    const canControl = isHost || !onlyHostControls;

    if (canControl) {
      const isPlaying = event.type === 'play' || event.type === 'timeupdate' || event.type === 'seeked';
      const force = event.type !== 'timeupdate';
      const eventType = event.type === 'seeked' || event.type === 'seeking' ? 'seek' : (isPlaying ? 'play' : 'pause');
      publishState(isPlaying, event.currentTime, force, partyRef.current?.season, partyRef.current?.episode, partyRef.current?.server_key, eventType);
    } else {
      if (event.type === 'timeupdate' && !hostPaused) {
        checkDrift(event.currentTime);
      }
    }

    // Report member telemetry status (buffering, paused, synced, desynced)
    if (event.type === 'waiting' || event.type === 'buffering') {
      sendMemberStatus('buffering', event.currentTime, driftSeconds);
    } else if (event.type === 'pause' || hostPaused) {
      sendMemberStatus('paused', event.currentTime, driftSeconds);
    } else if (event.type === 'play' || event.type === 'timeupdate' || event.type === 'seeked') {
      const myStatus = driftSeconds > 3.0 ? 'desynced' : 'synced';
      sendMemberStatus(myStatus, event.currentTime, driftSeconds);
    }
  }, [isHost, onlyHostControls, hostPaused, checkDrift, driftSeconds, publishState, sendMemberStatus]);

  // =========================================================================
  // Chat & Social Controls
  // =========================================================================
  const sendChatMessage = useCallback(async (body: string) => {
    if (!code) return;
    
    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.sendChatMessage(body, userAvatar, userColor);
    } else {
      await partyApi.sendMessage(code, body, userAvatar, userColor);
    }
  }, [code, userAvatar, userColor]);

  const sendReaction = useCallback(async (emoji: string) => {
    if (!code) return;
    
    const storedUser = localStorage.getItem('mondoflix_user');
    let myName = 'You';
    try {
      if (storedUser) myName = JSON.parse(storedUser).username || myName;
    } catch {}
    
    triggerReaction(emoji, myName, userAvatar);

    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.sendReaction(emoji, userAvatar);
    } else {
      await partyApi.sendReaction(code, emoji, userAvatar);
    }
  }, [code, userAvatar, triggerReaction]);

  const sendTyping = useCallback(() => {
    if (socketRef.current && socketRef.current.isConnected) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socketRef.current.sendTyping();
      typingTimerRef.current = setTimeout(() => {}, 3000);
    }
  }, []);

  const updatePartySettings = useCallback(async (settings: { only_host_controls?: boolean }) => {
    if (!code || !isHost) return;
    if (settings.only_host_controls !== undefined) {
      setOnlyHostControls(settings.only_host_controls);
      if (socketRef.current && socketRef.current.isConnected) {
        socketRef.current.sendSettingsUpdate(settings);
      }
      await partyApi.updateSettings(code, settings);
    }
  }, [code, isHost]);

  const transferHost = useCallback(async (newHostId: string | number) => {
    if (!code || !isHost) return;
    try {
      if (socketRef.current && socketRef.current.isConnected) {
        socketRef.current.sendTransferHost(newHostId);
      }
      await partyApi.transferHost(code, newHostId);
    } catch (e) {
      console.error('Failed to transfer host privileges', e);
      throw e;
    }
  }, [code, isHost]);

  const setUserAvatar = (avatar: string) => {
    setUserAvatarState(avatar);
    localStorage.setItem('mondoflix_party_avatar', avatar);
    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.sendProfileUpdate(avatar, colorRef.current);
    }
  };

  const setUserColor = (color: string) => {
    setUserColorState(color);
    localStorage.setItem('mondoflix_party_color', color);
    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.sendProfileUpdate(avatarRef.current, color);
    }
  };

  const leaveParty = useCallback(async () => {
    if (!code) return;
    try {
      if (socketRef.current && socketRef.current.isConnected) {
        socketRef.current.sendLeaveParty();
      }
      await partyApi.leave(code);
    } catch (e) {
      console.error('Leave party error', e);
    } finally {
      sessionStorage.removeItem('active_party_code');
    }
  }, [code]);

  const endParty = useCallback(async () => {
    if (!code) return;
    try {
      if (socketRef.current && socketRef.current.isConnected) {
        socketRef.current.sendEndParty();
      }
      await partyApi.end(code);
    } catch (e) {
      console.error('End party error', e);
    } finally {
      sessionStorage.removeItem('active_party_code');
      onPartyEndedRef.current?.('Watch party ended by host.');
    }
  }, [code]);

  const kickMember = useCallback(async (targetUserId: string | number) => {
    if (!code || !isHost) return;
    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.sendKickUser(targetUserId);
    }
    try {
      const res = await partyApi.kick(code, targetUserId);
      if (res.members) {
        setMembers(res.members);
      }
    } catch (e) {
      console.error('Failed to kick member', e);
    }
  }, [code, isHost]);

  // =========================================================================
  // Control Request Handlers
  // =========================================================================
  const requestControl = useCallback(async () => {
    if (!code || isHost) return;
    setMyControlRequestPending(true);
    setControlFeedback('Request sent! Waiting for host to approve...');

    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.requestControl();
    }
    const identity = getUserIdentity();
    await partyApi.requestControl(code, {
      id: identity.id,
      name: identity.name,
      avatar: avatarRef.current
    }).catch(console.error);
  }, [code, isHost]);

  const grantControl = useCallback(async (requesterId: string | number) => {
    if (!code || !isHost) return;
    setControlRequests(prev => prev.filter(r => String(r.requesterId) !== String(requesterId)));
    setOnlyHostControls(false);

    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.respondControlRequest(requesterId, true);
    }
    await partyApi.respondControl(code, requesterId, true).catch(console.error);
  }, [code, isHost]);

  const declineControl = useCallback(async (requesterId: string | number) => {
    if (!code || !isHost) return;
    setControlRequests(prev => prev.filter(r => String(r.requesterId) !== String(requesterId)));

    if (socketRef.current && socketRef.current.isConnected) {
      socketRef.current.respondControlRequest(requesterId, false);
    }
    await partyApi.respondControl(code, requesterId, false).catch(console.error);
  }, [code, isHost]);

  const clearControlFeedback = useCallback(() => {
    setControlFeedback(null);
  }, []);

  /**
   * Packaged Media Player State and Interaction Interface
   */
  const playerInterface: WatchPartyPlayerInterface = useMemo(() => ({
    isPlaying: !(hostPaused || (stateRef.current ? !stateRef.current.is_playing : false)),
    currentTime: lastPlayerPositionRef.current || stateRef.current?.position_seconds || 0,
    isHost,
    onlyHostControls,
    canControl: isHost || !onlyHostControls,
    driftSeconds,
    isSynced: driftSeconds <= 3.0,
    hostPaused,
    play,
    pause,
    seek,
    resync,
    handlePlayerEvent
  }), [hostPaused, isHost, onlyHostControls, driftSeconds, play, pause, seek, resync, handlePlayerEvent]);

  return {
    // Room & Session State
    party,
    members,
    messages,
    isHost,
    error,
    isConnected,
    hostPaused,
    driftSeconds,
    floatingReactions,
    typingUsers,
    userAvatar,
    userColor,
    onlyHostControls,

    // Control Request State & Actions
    controlRequests,
    myControlRequestPending,
    controlFeedback,
    clearControlFeedback,
    requestControl,
    grantControl,
    declineControl,

    // High-level Media Player Interface
    player: playerInterface,

    // Core Playback & Synchronization Controls
    play,
    pause,
    togglePause,
    seek,
    resync,
    handlePlayerEvent,
    publishState,
    expectedHostPosition,
    checkDrift,

    // Social, Chat & Member Actions
    sendChatMessage,
    sendReaction,
    sendTyping,
    sendMemberStatus,
    leaveParty,
    endParty,
    kickMember,
    updatePartySettings,
    transferHost,
    setUserAvatar,
    setUserColor,
  };
}
