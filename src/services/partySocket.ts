/**
 * WebSocket Client Wrapper for Real-Time Watch Party State Management
 * Follows the standardized room state schema:
 * - join_room
 * - playback_command (play / pause / seek)
 * - chat_message
 * - reaction
 * - heartbeat (for host-driven drift compensation & player synchronization)
 */

import type { PartyMember, PartyMessage, PartyState } from '../types/party';

export interface RoomStatePayload {
  type: 'room_state';
  roomId: string;
  hostId: string | number;
  mediaId: string;
  isPlaying: boolean;
  hostTime: number;
  hostUpdatedAt: number;
  members: PartyMember[];
  settings: {
    hostOnly: boolean;
    maxMembers: number;
  };
  durationSeconds?: number | null;
  serverKey?: string | null;
}

export interface PlaybackStatePayload {
  type: 'playback_state';
  isPlaying: boolean;
  hostTime: number;
  hostUpdatedAt: number;
}

export interface ChatMessagePayload {
  type: 'chat_message';
  user: {
    id: string | number;
    name: string;
    avatar?: string;
  };
  text: string;
  ts: number;
}

export interface ReactionPayload {
  type: 'reaction';
  user: {
    id: string | number;
    name: string;
    avatar?: string;
  };
  emoji: string;
  ts: number;
}

export interface PartySocketEvents {
  open: () => void;
  close: (event: CloseEvent) => void;
  error: (error: Event | Error) => void;
  room_state: (data: RoomStatePayload) => void;
  playback_state: (data: PlaybackStatePayload) => void;
  chat_message: (data: ChatMessagePayload) => void;
  reaction: (data: ReactionPayload) => void;
  'party:members': (data: { members: PartyMember[]; event?: string; user?: { name: string; avatar?: string } }) => void;
  'party:state': (data: { state: PartyState; trigger_user?: string }) => void;
  'party:message': (data: { message: PartyMessage }) => void;
  'party:reaction': (data: { emoji: string; user_name: string; user_avatar?: string }) => void;
  'party:settings': (data: { only_host_controls?: boolean }) => void;
  'party:typing': (data: { user_name: string }) => void;
  host_changed: (data: { newHostId: string | number; newHostName: string; members: PartyMember[] }) => void;
  'party:host_transferred': (data: { new_host_id: string | number; new_host_name: string; previous_host_name: string }) => void;
  'party:members_update': (data: { members: PartyMember[] }) => void;
  kicked: (data: { reason?: string }) => void;
  'party:ended': (data: { message?: string }) => void;
  init: (data: { party: any; members: PartyMember[]; messages: PartyMessage[]; server_time: number }) => void;
  control_requested: (data: { requesterId: string | number; requesterName: string; requesterAvatar?: string; ts: number }) => void;
  control_granted: (data: { requesterId: string | number; requesterName: string; ts: number }) => void;
  control_declined: (data: { requesterId: string | number; ts: number }) => void;
}

type EventKey = keyof PartySocketEvents;

export interface PartySocketConnectOptions {
  code: string;
  userId: string | number;
  username: string;
  avatar?: string;
  color?: string;
  token?: string | null;
}

export class PartySocketClient {
  private ws: WebSocket | null = null;
  private options: PartySocketConnectOptions | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageQueue: string[] = [];
  private isExplicitlyClosed = false;

  public isConnected = false;

  constructor() {}

  public connect(options: PartySocketConnectOptions) {
    this.options = options;
    this.isExplicitlyClosed = false;
    this.clearReconnectTimer();

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const { code, userId, username, avatar = '🍿', color = '#06b6d4', token = '' } = options;

    const wsUrl = `${protocol}//${host}/ws/party?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token || '')}&userId=${encodeURIComponent(String(userId))}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatar)}&color=${encodeURIComponent(color)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // 1. Send standard join_room payload
        this.send({
          type: 'join_room',
          roomId: code,
          user: { id: userId, name: username, avatar }
        });

        // 2. Also send legacy join payload for backward compatibility
        this.send({
          type: 'join',
          code,
          user: { id: userId, name: username, avatar, color }
        });

        // 3. Flush any queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(msg);
          }
        }

        this.emit('open', undefined);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type) {
            this.emit(data.type as EventKey, data);
          }
        } catch (err) {
          console.error('[PartySocket] Message parse error:', err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('close', event);

        if (!this.isExplicitlyClosed && event.code !== 1000 && event.code !== 1008) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error: Event) => {
        this.isConnected = false;
        this.emit('error', error);
      };
    } catch (err: any) {
      console.error('[PartySocket] Connection initialization error:', err);
      this.emit('error', err);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.messageQueue = [];

    if (this.ws) {
      try {
        this.ws.close(1000, 'User left party');
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed || !this.options) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[PartySocket] Max reconnect attempts reached');
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed && this.options) {
        this.connect(this.options);
      }
    }, backoffMs);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public send(payload: any): boolean {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
      return true;
    } else {
      // Buffer if not explicitly closed
      if (!this.isExplicitlyClosed && this.messageQueue.length < 50) {
        this.messageQueue.push(raw);
      }
      return false;
    }
  }

  /**
   * Send standardized join_room command
   */
  public joinRoom(roomId: string, user: { id: string | number; name: string; avatar?: string; color?: string }) {
    return this.send({
      type: 'join_room',
      roomId,
      user
    });
  }

  /**
   * Send standardized playback_command (play, pause, seek)
   */
  public sendPlaybackCommand(command: 'play' | 'pause' | 'seek', time: number) {
    return this.send({
      type: 'playback_command',
      command,
      time,
      emitTime: Date.now()
    });
  }

  /**
   * Start periodic host heartbeat for drift compensation and player sync
   */
  public startHeartbeat(getState: () => { hostTime: number; isPlaying: boolean }, intervalMs = 2500) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        const { hostTime, isPlaying } = getState();
        this.send({
          type: 'heartbeat',
          hostTime,
          isPlaying,
          ts: Date.now()
        });
      }
    }, intervalMs);
  }

  public stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send standardized chat message
   */
  public sendChatMessage(text: string, avatar?: string, color?: string) {
    const now = Date.now();
    return this.send({
      type: 'chat_message',
      text,
      body: text,
      avatar,
      color,
      ts: now
    });
  }

  /**
   * Send reaction emoji
   */
  public sendReaction(emoji: string, avatar?: string) {
    return this.send({
      type: 'reaction',
      emoji,
      avatar,
      ts: Date.now()
    });
  }

  /**
   * Send typing indicator
   */
  public sendTyping() {
    return this.send({ type: 'typing' });
  }

  /**
   * Send member playback/drift status (synced, buffering, desynced, paused)
   */
  public sendMemberStatus(status: 'synced' | 'buffering' | 'desynced' | 'paused', positionSeconds?: number, driftSeconds?: number) {
    return this.send({
      type: 'member_status',
      status,
      position_seconds: positionSeconds,
      drift_seconds: driftSeconds
    });
  }

  /**
   * Update party settings (e.g. only_host_controls)
   */
  public sendSettingsUpdate(settings: { only_host_controls?: boolean }) {
    return this.send({
      type: 'settings_update',
      settings
    });
  }

  /**
   * Transfer host controls to another participant
   */
  public sendTransferHost(newHostId: string | number) {
    return this.send({
      type: 'transfer_host',
      newHostId: String(newHostId)
    });
  }

  /**
   * Update member avatar or color profile
   */
  public sendProfileUpdate(avatar?: string, color?: string) {
    return this.send({
      type: 'profile_update',
      avatar,
      color
    });
  }

  /**
   * Host kick member
   */
  public sendKickUser(targetUserId: string | number) {
    return this.send({
      type: 'kick_user',
      targetUserId: String(targetUserId)
    });
  }

  /**
   * Leave current watch party room
   */
  public sendLeaveParty() {
    return this.send({ type: 'leave_party' });
  }

  /**
   * End watch party for all participants (host only)
   */
  public sendEndParty() {
    return this.send({ type: 'end_party' });
  }

  /**
   * Request playback control from the host
   */
  public requestControl() {
    return this.send({
      type: 'request_control',
      ts: Date.now()
    });
  }

  /**
   * Host response to a control request (approve or decline)
   */
  public respondControlRequest(requesterId: string | number, approved: boolean) {
    return this.send({
      type: 'respond_control_request',
      requesterId: String(requesterId),
      approved
    });
  }

  /**
   * Event subscription
   */
  public on<K extends EventKey>(event: K, handler: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  public off<K extends EventKey>(event: K, handler: (data: any) => void) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      for (const fn of set) {
        try {
          fn(data);
        } catch (e) {
          console.error(`[PartySocket] Error in listener for event ${event}:`, e);
        }
      }
    }
  }
}
