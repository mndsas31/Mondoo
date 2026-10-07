import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mondoflix_jwt_secret_dev_key_2026';
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mondoflix.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DbSchema {
  users: Array<{ id: number; username: string; email: string; password: string; role?: string; created_at: string }>;
  parties: Record<string, {
    id: number;
    code: string;
    host_user_id: number | string;
    host_name: string;
    media_id: number;
    media_type: 'movie' | 'tv';
    season: number | null;
    episode: number | null;
    title: string;
    poster_path: string | null;
    is_playing: boolean;
    position_seconds: number;
    state_updated_at: string;
    server_key: string | null;
    version: number;
    is_active: boolean;
    only_host_controls: boolean;
    created_at: string;
    ended_at: string | null;
  }>;
  party_members: Record<string, Array<{
    id: number | string;
    user_id: number | string;
    name: string;
    avatar?: string;
    color?: string;
    is_host: boolean;
    online: boolean;
    joined_at: string;
    last_seen_at: string;
    status?: 'synced' | 'buffering' | 'desynced' | 'paused' | 'offline';
    position_seconds?: number;
    drift_seconds?: number;
  }>>;
  party_messages: Record<string, Array<{
    id: number;
    party_code: string;
    user_id: number | string;
    user_name: string;
    user_avatar?: string;
    user_color?: string;
    kind: 'chat' | 'system' | 'reaction';
    body: string;
    created_at: string;
  }>>;
  party_blacklists: Record<string, string[]>;
  watchlist: Array<{ id: number; user_id: number; media_id: number; media_type: string; title: string; poster_path?: string; added_at: string }>;
  progress: Array<{ id: number; user_id: number; media_id: number; media_type: string; season?: number; episode?: number; progress_seconds: number; duration_seconds: number; last_watched: string }>;
  settings: Record<string, string>;
  notifications: Array<{ id: number; user_id: number; title: string; message: string; is_read: boolean; created_at: string }>;
  search_history: Array<{ id: number; user_id: number; media_id: number; item_json: string; created_at: string }>;
  sources: Array<{
    id: number;
    media_id: number;
    media_type: 'movie' | 'tv';
    season: number | null;
    episode: number | null;
    server_key: string;
    source: string;
    quality: string | null;
    language: string | null;
    is_active: boolean;
    priority: number;
    reports: number;
    added_by: number | null;
    created_at: string;
  }>;
  friends: Array<{ id: number; user_id_1: string | number; user_id_2: string | number; created_at: string }>;
  friend_requests: Array<{ id: number; sender_id: string | number; sender_name: string; sender_avatar?: string; receiver_id: string | number; receiver_name: string; status: 'pending' | 'accepted' | 'declined'; created_at: string }>;
  direct_messages: Array<{ id: number; sender_id: string | number; sender_name: string; sender_avatar?: string; receiver_id: string | number; receiver_name: string; body: string; is_read: boolean; created_at: string }>;
}

let db: DbSchema = {
  users: [],
  parties: {},
  party_members: {},
  party_messages: {},
  party_blacklists: {},
  watchlist: [],
  progress: [],
  settings: {},
  notifications: [],
  search_history: [],
  sources: [],
  friends: [],
  friend_requests: [],
  direct_messages: []
};

// Load initial DB from disk
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = { ...db, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to parse database file, starting fresh', e);
  }
}

// Ensure all schema collections are fully initialized
db.users = db.users || [];
db.parties = db.parties || {};
db.party_members = db.party_members || {};
db.party_messages = db.party_messages || {};
db.party_blacklists = db.party_blacklists || {};
db.watchlist = db.watchlist || [];
db.progress = db.progress || [];
db.settings = db.settings || {};
db.notifications = db.notifications || [];
db.search_history = db.search_history || [];
db.sources = db.sources || [];
db.friends = db.friends || [];
db.friend_requests = db.friend_requests || [];
db.direct_messages = db.direct_messages || [];

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist database', e);
  }
}

// User auth helper
function getAuthUser(req: express.Request): { id: number | string; username: string; email: string; role?: string } | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      const user = db.users.find(u => u.id === payload.id);
      if (user) return { id: user.id, username: user.username, email: user.email, role: (user as any).role || 'user' };
      return { id: payload.id || 9999, username: payload.username || 'Guest', email: payload.email || '', role: 'user' };
    } catch {
      // Fallback to guest headers below
    }
  }

  const guestId = (req.headers['x-guest-id'] as string) || (req.body?.id as string);
  const guestName = (req.headers['x-guest-name'] as string) || (req.body?.displayName as string) || (req.body?.name as string);
  if (guestId || guestName) {
    return {
      id: guestId || `guest-${Date.now()}`,
      username: guestName ? decodeURIComponent(guestName) : 'Guest',
      email: '',
      role: 'guest'
    };
  }

  return null;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json());

  // WebSocket Server Setup on /ws/party
  const wss = new WebSocketServer({ noServer: true });
  
  interface PartyClient {
    ws: WebSocket;
    code: string;
    userId: string;
    userName: string;
    userAvatar: string;
    userColor: string;
  }

  const roomClients = new Map<string, Set<PartyClient>>();
  const pendingDisconnects = new Map<string, NodeJS.Timeout>();
  const hostDisconnectTimeouts = new Map<string, NodeJS.Timeout>();
  const roomMetadata = new Map<string, { lastActivityAt: number; createdAt: number }>();
  const chatRateLimits = new Map<WebSocket, number[]>();
  const reactionRateLimits = new Map<WebSocket, number[]>();

  function broadcastToRoom(code: string, payload: any, excludeWs?: WebSocket) {
    const clients = roomClients.get(code);
    if (!clients) return;
    const messageStr = JSON.stringify(payload);
    for (const client of clients) {
      if (excludeWs && client.ws === excludeWs) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }

  // Periodic room lifecycle check: auto-close idle rooms (30m) or expired rooms (4h)
  setInterval(() => {
    const now = Date.now();
    const IDLE_TTL = 30 * 60 * 1000;       // 30 minutes
    const MAX_DURATION = 4 * 60 * 60 * 1000; // 4 hours

    for (const [code, party] of Object.entries(db.parties)) {
      if (!party.is_active) continue;
      const meta = roomMetadata.get(code) || { lastActivityAt: now, createdAt: new Date(party.created_at || now).getTime() };
      const isIdle = (now - meta.lastActivityAt) > IDLE_TTL;
      const isMaxDuration = (now - meta.createdAt) > MAX_DURATION;

      if (isIdle || isMaxDuration) {
        party.is_active = false;
        party.ended_at = new Date().toISOString();
        saveDb();
        const reason = isIdle 
          ? 'Watch party auto-closed due to 30 minutes of inactivity.' 
          : 'Watch party reached maximum allowed duration (4 hours).';
        
        broadcastToRoom(code, {
          type: 'party:ended',
          message: reason
        });

        // Purge ephemeral messages from memory
        delete db.party_messages[code];
        roomMetadata.delete(code);
      }
    }
  }, 60000);

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws/party') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const code = (url.searchParams.get('code') || '').toUpperCase();
    const userId = url.searchParams.get('userId') || `guest-${Date.now()}`;
    const userName = url.searchParams.get('username') || 'Guest';
    const userAvatar = url.searchParams.get('avatar') || '🍿';
    const userColor = url.searchParams.get('color') || '#06b6d4';

    if (!code) {
      ws.close(1008, 'Party code required');
      return;
    }

    // Check blacklist
    if (db.party_blacklists[code]?.includes(String(userId))) {
      ws.send(JSON.stringify({ type: 'kicked', reason: 'host_action' }));
      ws.close(1008, 'You have been kicked from this watch party');
      return;
    }

    // Enforce 10-member room cap
    const activeMembers = (db.party_members[code] || []).filter(m => m.online && String(m.user_id) !== String(userId));
    if (activeMembers.length >= 10) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'This watch party is full (maximum 10 viewers on the free plan). Please start a new room!' 
      }));
      ws.close(1008, 'Room capacity reached');
      return;
    }

    const client: PartyClient = { ws, code, userId, userName, userAvatar, userColor };
    
    // Clear any pending disconnect timeouts for this user
    const disconnectKey = `${code}:${userId}`;
    if (pendingDisconnects.has(disconnectKey)) {
      clearTimeout(pendingDisconnects.get(disconnectKey)!);
      pendingDisconnects.delete(disconnectKey);
    }

    // If host reconnected, cancel host disconnect migration timer
    if (db.parties[code] && String(db.parties[code].host_user_id) === String(userId)) {
      if (hostDisconnectTimeouts.has(code)) {
        clearTimeout(hostDisconnectTimeouts.get(code)!);
        hostDisconnectTimeouts.delete(code);
      }
    }

    // Track room activity
    if (!roomMetadata.has(code)) {
      roomMetadata.set(code, { lastActivityAt: Date.now(), createdAt: Date.now() });
    } else {
      roomMetadata.get(code)!.lastActivityAt = Date.now();
    }

    if (!roomClients.has(code)) {
      roomClients.set(code, new Set());
    }
    roomClients.get(code)!.add(client);

    // Update member list presence
    if (!db.party_members[code]) {
      db.party_members[code] = [];
    }
    const existing = db.party_members[code].find(m => String(m.user_id) === String(userId));
    if (existing) {
      existing.online = true;
      existing.avatar = userAvatar;
      existing.color = userColor;
      existing.last_seen_at = new Date().toISOString();
    } else {
      db.party_members[code].push({
        id: Date.now(),
        user_id: userId,
        name: userName,
        avatar: userAvatar,
        color: userColor,
        is_host: db.parties[code] ? String(db.parties[code].host_user_id) === String(userId) : false,
        online: true,
        joined_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      });
    }
    saveDb();

    // Send initial snapshot to joining client
    const party = db.parties[code];
    const members = db.party_members[code] || [];
    const messages = db.party_messages[code] || [];
    
    // Legacy init payload
    ws.send(JSON.stringify({
      type: 'init',
      party,
      members,
      messages: messages.slice(-50),
      server_time: Date.now()
    }));

    // Standardized room_state snapshot (Server → Client)
    ws.send(JSON.stringify({
      type: 'room_state',
      roomId: code,
      hostId: party ? party.host_user_id : '',
      mediaId: party ? String(party.media_id) : '',
      isPlaying: party ? party.is_playing : false,
      hostTime: party ? party.position_seconds : 0,
      hostUpdatedAt: party ? new Date(party.state_updated_at).getTime() : Date.now(),
      members: members.map(m => ({
        id: m.user_id,
        name: m.name,
        avatar: m.avatar,
        isHost: m.is_host,
        online: m.online
      })),
      settings: {
        hostOnly: party ? (party.only_host_controls ?? true) : true,
        maxMembers: 10
      }
    }));

    // Broadcast member update & join notification
    broadcastToRoom(code, {
      type: 'party:members',
      event: 'join',
      members: db.party_members[code] || [],
      user: { name: userName, avatar: userAvatar }
    }, ws);

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const party = db.parties[code];
        const now = Date.now();

        // Refresh room activity timestamp
        if (roomMetadata.has(code)) {
          roomMetadata.get(code)!.lastActivityAt = now;
        }

        // Schema 1: Standard join_room
        if (data.type === 'join_room') {
          if (data.user) {
            client.userId = data.user.id || client.userId;
            client.userName = data.user.name || client.userName;
            client.userAvatar = data.user.avatar || client.userAvatar;
          }
          if (party) {
            const lastUpdate = new Date(party.state_updated_at || now).getTime();
            const elapsed = party.is_playing ? Math.max(0, (now - lastUpdate) / 1000) : 0;
            const exactHostTime = (party.position_seconds || 0) + elapsed;

            ws.send(JSON.stringify({
              type: 'room_state',
              roomId: code,
              hostId: party.host_user_id,
              mediaId: String(party.media_id),
              mediaType: party.media_type,
              title: party.title,
              season: party.season,
              episode: party.episode,
              serverKey: party.server_key,
              isPlaying: party.is_playing,
              hostTime: exactHostTime,
              hostUpdatedAt: now,
              durationSeconds: (party as any).duration_seconds,
              members: (db.party_members[code] || []).map(m => ({
                id: m.user_id,
                name: m.name,
                avatar: m.avatar,
                isHost: m.is_host,
                online: m.online
              })),
              settings: {
                hostOnly: party.only_host_controls ?? true,
                maxMembers: 10
              }
            }));

            // Immediately send authoritative playback_state with exact timestamp
            ws.send(JSON.stringify({
              type: 'playback_state',
              isPlaying: party.is_playing,
              hostTime: exactHostTime,
              hostUpdatedAt: now
            }));
          }
        }

        // Schema 2: Standard playback_command (play, pause, seek)
        else if (data.type === 'playback_command') {
          if (!party) return;
          if (party.only_host_controls && String(party.host_user_id) !== String(userId)) {
            return;
          }

          if (data.command === 'play') {
            party.is_playing = true;
            if (data.time !== undefined && isFinite(data.time)) party.position_seconds = data.time;
          } else if (data.command === 'pause') {
            party.is_playing = false;
            if (data.time !== undefined && isFinite(data.time)) party.position_seconds = data.time;
          } else if (data.command === 'seek' && data.time !== undefined && isFinite(data.time)) {
            party.position_seconds = data.time;
          }

          party.state_updated_at = new Date().toISOString();
          party.version += 1;
          saveDb();

          // Standard playback_state broadcast
          broadcastToRoom(code, {
            type: 'playback_state',
            isPlaying: party.is_playing,
            hostTime: party.position_seconds,
            hostUpdatedAt: Date.now()
          });

          // Also broadcast legacy party:state
          broadcastToRoom(code, {
            type: 'party:state',
            state: {
              ...party,
              event_type: data.command,
              server_time: Date.now()
            },
            trigger_user: userName
          });
        }

        // Schema 3: Host Heartbeat & Drift Compensation
        else if (data.type === 'heartbeat') {
          if (!party) return;
          // Only host emits authoritative heartbeats
          if (String(party.host_user_id) === String(userId)) {
            if (data.hostTime !== undefined && isFinite(data.hostTime)) {
              party.position_seconds = data.hostTime;
            }
            if (data.isPlaying !== undefined) {
              party.is_playing = !!data.isPlaying;
            }
            party.state_updated_at = new Date().toISOString();

            // Broadcast real-time playback state to guests for drift calculation
            broadcastToRoom(code, {
              type: 'playback_state',
              isPlaying: party.is_playing,
              hostTime: party.position_seconds,
              hostUpdatedAt: Date.now()
            }, ws);
          }
        }

        // Schema 4: Standard chat_message (with rate-limiting: 1 msg/s)
        else if (data.type === 'chat_message') {
          const rawText = data.text || data.body;
          if (!rawText || !rawText.trim()) return;

          // Rate limit: 1 msg / sec per socket
          const history = chatRateLimits.get(ws) || [];
          const recent = history.filter(t => now - t < 1000);
          if (recent.length >= 1) {
            ws.send(JSON.stringify({ type: 'error', message: 'Chat rate limit: 1 message per second' }));
            return;
          }
          recent.push(now);
          chatRateLimits.set(ws, recent);

          const trimmedText = rawText.trim().slice(0, 500);
          const newMsg = {
            id: Date.now(),
            party_code: code,
            user_id: userId,
            user_name: userName,
            user_avatar: data.avatar || userAvatar,
            user_color: data.color || userColor,
            kind: 'chat' as const,
            body: trimmedText,
            created_at: new Date().toISOString()
          };

          if (!db.party_messages[code]) db.party_messages[code] = [];
          db.party_messages[code].push(newMsg);
          // Ephemeral chat: keep last 50 messages only
          if (db.party_messages[code].length > 50) {
            db.party_messages[code] = db.party_messages[code].slice(-50);
          }
          saveDb();

          // Standard broadcast
          broadcastToRoom(code, {
            type: 'chat_message',
            user: { id: userId, name: userName, avatar: userAvatar },
            text: trimmedText,
            ts: now
          });

          // Legacy broadcast
          broadcastToRoom(code, {
            type: 'party:message',
            message: newMsg
          });
        }

        // Schema 5: Standard reaction (with rate-limiting: max 3 per 2s)
        else if (data.type === 'reaction') {
          if (!data.emoji) return;

          // Rate limit: max 3 reactions per 2 seconds
          const history = reactionRateLimits.get(ws) || [];
          const recent = history.filter(t => now - t < 2000);
          if (recent.length >= 3) return;
          recent.push(now);
          reactionRateLimits.set(ws, recent);

          // Standard reaction broadcast
          broadcastToRoom(code, {
            type: 'reaction',
            user: { id: userId, name: userName, avatar: userAvatar },
            emoji: data.emoji,
            ts: now
          });

          // Legacy reaction broadcast
          broadcastToRoom(code, {
            type: 'party:reaction',
            emoji: data.emoji,
            user_name: userName,
            user_avatar: data.avatar || userAvatar
          });
        }

        // Schema 6: Host kick user
        else if (data.type === 'kick_user') {
          if (!party || String(party.host_user_id) !== String(userId)) return;
          const targetId = String(data.targetUserId || data.target_user_id);

          if (!db.party_blacklists[code]) db.party_blacklists[code] = [];
          if (!db.party_blacklists[code].includes(targetId)) {
            db.party_blacklists[code].push(targetId);
          }
          if (db.party_members[code]) {
            db.party_members[code] = db.party_members[code].filter(m => String(m.user_id) !== targetId);
          }
          saveDb();

          // Send kicked event to target user socket and disconnect
          const clients = roomClients.get(code);
          if (clients) {
            for (const c of clients) {
              if (String(c.userId) === targetId) {
                c.ws.send(JSON.stringify({ type: 'kicked', reason: 'host_action' }));
                c.ws.close(1000, 'Kicked by host');
              }
            }
          }

          broadcastToRoom(code, {
            type: 'party:members',
            event: 'kick',
            members: db.party_members[code]
          });
        }

        // Schema 6b: End Watch Party (Host ends session for everyone in real time)
        else if (data.type === 'end_party') {
          if (!party) return;
          const isHost = String(party.host_user_id) === String(userId);
          if (!isHost) return;

          party.is_active = false;
          party.ended_at = new Date().toISOString();
          saveDb();

          broadcastToRoom(code, {
            type: 'party:ended',
            message: 'Host has ended the watch party.'
          });
        }

        // Schema 6c: Member leaves watch party
        else if (data.type === 'leave_party') {
          if (db.party_members[code]) {
            db.party_members[code] = db.party_members[code].filter(m => String(m.user_id) !== String(userId));
            saveDb();
            broadcastToRoom(code, {
              type: 'party:members',
              event: 'leave',
              members: db.party_members[code]
            });
          }
        }

        // Schema 7: Request Player Control (Members request control from Host)
        else if (data.type === 'request_control') {
          if (!party) return;
          if (!party.only_host_controls || String(party.host_user_id) === String(userId)) {
            ws.send(JSON.stringify({
              type: 'control_granted',
              requesterId: String(userId),
              requesterName: userName,
              ts: now
            }));
            return;
          }

          // Broadcast control request to room (host will pick this up)
          broadcastToRoom(code, {
            type: 'control_requested',
            requesterId: String(userId),
            requesterName: userName,
            requesterAvatar: userAvatar,
            ts: now
          });

          // Add system notification in chat
          const sysMsg = {
            id: Date.now(),
            party_code: code,
            user_id: userId,
            user_name: 'System',
            kind: 'system' as const,
            body: `🙋 ${userName} requested control of the player.`,
            created_at: new Date().toISOString()
          };
          if (!db.party_messages[code]) db.party_messages[code] = [];
          db.party_messages[code].push(sysMsg);
          saveDb();
          broadcastToRoom(code, { type: 'party:message', message: sysMsg });
        }

        // Schema 8: Host responds to Control Request
        else if (data.type === 'respond_control_request') {
          if (!party) return;
          const isHost = String(party.host_user_id) === String(userId);
          if (!isHost) return;

          const targetId = String(data.requesterId || data.requester_id);
          const approved = !!data.approved;
          const targetMember = db.party_members[code]?.find(m => String(m.user_id) === targetId);
          const targetName = targetMember?.name || 'Viewer';

          if (approved) {
            party.only_host_controls = false;
            saveDb();

            broadcastToRoom(code, {
              type: 'party:settings',
              only_host_controls: false
            });

            broadcastToRoom(code, {
              type: 'control_granted',
              requesterId: targetId,
              requesterName: targetName,
              ts: now
            });

            const sysMsg = {
              id: Date.now(),
              party_code: code,
              user_id: userId,
              user_name: 'System',
              kind: 'system' as const,
              body: `🎮 Host approved player control! Shared controls are now unlocked for ${targetName}.`,
              created_at: new Date().toISOString()
            };
            if (!db.party_messages[code]) db.party_messages[code] = [];
            db.party_messages[code].push(sysMsg);
            saveDb();
            broadcastToRoom(code, { type: 'party:message', message: sysMsg });
          } else {
            broadcastToRoom(code, {
              type: 'control_declined',
              requesterId: targetId,
              ts: now
            });

            const sysMsg = {
              id: Date.now(),
              party_code: code,
              user_id: userId,
              user_name: 'System',
              kind: 'system' as const,
              body: `🔒 Host kept controls locked to Host Only.`,
              created_at: new Date().toISOString()
            };
            if (!db.party_messages[code]) db.party_messages[code] = [];
            db.party_messages[code].push(sysMsg);
            saveDb();
            broadcastToRoom(code, { type: 'party:message', message: sysMsg });
          }
        }

        // Schema 9: Host Transfer / Pass Host
        else if (data.type === 'transfer_host') {
          if (!party) return;
          const isHost = String(party.host_user_id) === String(userId);
          if (!isHost) return;

          const newHostId = String(data.newHostId || data.new_host_id);
          const members = db.party_members[code] || [];
          const targetMember = members.find(m => String(m.user_id) === newHostId || String(m.id) === newHostId);

          if (targetMember) {
            const previousHostName = party.host_name;
            const newHostName = targetMember.name;

            party.host_user_id = targetMember.user_id;
            party.host_name = newHostName;
            party.version = (party.version || 0) + 1;

            members.forEach(m => {
              m.is_host = String(m.user_id) === String(targetMember.user_id);
            });

            saveDb();

            broadcastToRoom(code, {
              type: 'party:host_transferred',
              new_host_id: String(targetMember.user_id),
              new_host_name: newHostName,
              previous_host_name: previousHostName
            });

            broadcastToRoom(code, {
              type: 'party:members_update',
              members
            });

            const sysMsg = {
              id: Date.now(),
              party_code: code,
              user_id: userId,
              user_name: 'System',
              kind: 'system' as const,
              body: `👑 ${previousHostName} transferred host privileges to ${newHostName}.`,
              created_at: new Date().toISOString()
            };
            if (!db.party_messages[code]) db.party_messages[code] = [];
            db.party_messages[code].push(sysMsg);
            saveDb();
            broadcastToRoom(code, { type: 'party:message', message: sysMsg });
          }
        }

        // Legacy: state_update
        else if (data.type === 'state_update') {
          if (!party) return;
          if (party.only_host_controls && String(party.host_user_id) !== String(userId)) {
            return;
          }

          if (data.state.media_id !== undefined && data.state.media_id !== party.media_id) {
            party.media_id = data.state.media_id;
            if (data.state.media_type) party.media_type = data.state.media_type;
            if (data.state.title) party.title = data.state.title;
            if (data.state.poster_path !== undefined) party.poster_path = data.state.poster_path;
            party.position_seconds = 0;
            
            const sysMsg = {
              id: Date.now(),
              party_code: code,
              user_id: userId,
              user_name: 'System',
              kind: 'system' as const,
              body: `🎬 ${userName} changed the watch party to ${party.title}`,
              created_at: new Date().toISOString()
            };
            if (!db.party_messages[code]) db.party_messages[code] = [];
            db.party_messages[code].push(sysMsg);
            broadcastToRoom(code, { type: 'party:message', message: sysMsg });
          }

          party.is_playing = data.state.is_playing ?? party.is_playing;
          party.position_seconds = data.state.position_seconds ?? party.position_seconds;
          party.state_updated_at = new Date().toISOString();
          party.version += 1;
          if (data.state.season !== undefined) party.season = data.state.season;
          if (data.state.episode !== undefined) party.episode = data.state.episode;
          if (data.state.server_key !== undefined) party.server_key = data.state.server_key;

          saveDb();

          // Broadcast real-time playback state to all clients in room
          broadcastToRoom(code, {
            type: 'party:state',
            state: {
              ...party,
              event_type: data.state.event_type,
              server_time: Date.now()
            },
            trigger_user: userName
          }, ws);

          broadcastToRoom(code, {
            type: 'playback_state',
            isPlaying: party.is_playing,
            hostTime: party.position_seconds,
            hostUpdatedAt: Date.now()
          }, ws);

          // Add system event for play/pause/seek
          if (data.state.event_type === 'pause') {
            const mins = Math.floor(party.position_seconds / 60);
            const secs = Math.floor(party.position_seconds % 60);
            const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            const sysMsg = {
              id: Date.now(),
              party_code: code,
              user_id: userId,
              user_name: 'System',
              kind: 'system' as const,
              body: `⏸️ ${userName} paused the video at ${timeStr}`,
              created_at: new Date().toISOString()
            };
            if (!db.party_messages[code]) db.party_messages[code] = [];
            db.party_messages[code].push(sysMsg);
            broadcastToRoom(code, { type: 'party:message', message: sysMsg });
          } else if (data.state.event_type === 'play') {
            const sysMsg = {
              id: Date.now(),
              party_code: code,
              user_id: userId,
              user_name: 'System',
              kind: 'system' as const,
              body: `▶️ ${userName} resumed playback`,
              created_at: new Date().toISOString()
            };
            if (!db.party_messages[code]) db.party_messages[code] = [];
            db.party_messages[code].push(sysMsg);
            broadcastToRoom(code, { type: 'party:message', message: sysMsg });
          }
        } else if (data.type === 'typing') {
          broadcastToRoom(code, {
            type: 'party:typing',
            user_name: userName
          }, ws);
        } else if (data.type === 'settings_update') {
          if (party && String(party.host_user_id) === String(userId)) {
            if (data.settings.only_host_controls !== undefined) {
              party.only_host_controls = !!data.settings.only_host_controls;
              saveDb();
              broadcastToRoom(code, {
                type: 'party:settings',
                only_host_controls: party.only_host_controls
              });
              const sysMsg = {
                id: Date.now(),
                party_code: code,
                user_id: userId,
                user_name: 'System',
                kind: 'system' as const,
                body: party.only_host_controls ? '🔒 Host locked controls to Host Only' : '🔓 Host enabled shared playback controls',
                created_at: new Date().toISOString()
              };
              db.party_messages[code].push(sysMsg);
              broadcastToRoom(code, { type: 'party:message', message: sysMsg });
            }
          }
        } else if (data.type === 'profile_update') {
          if (data.avatar) client.userAvatar = data.avatar;
          if (data.color) client.userColor = data.color;
          if (db.party_members[code]) {
            const member = db.party_members[code].find(m => String(m.user_id) === String(userId));
            if (member) {
              if (data.avatar) member.avatar = data.avatar;
              if (data.color) member.color = data.color;
              saveDb();
              broadcastToRoom(code, { type: 'party:members', members: db.party_members[code] });
            }
          }
        } else if (data.type === 'member_status') {
          if (db.party_members[code]) {
            const member = db.party_members[code].find(m => String(m.user_id) === String(userId));
            if (member) {
              if (data.status) member.status = data.status;
              if (data.position_seconds !== undefined) member.position_seconds = data.position_seconds;
              if (data.drift_seconds !== undefined) member.drift_seconds = data.drift_seconds;
              member.last_seen_at = new Date().toISOString();
              member.online = true;
              broadcastToRoom(code, {
                type: 'party:members',
                event: 'status_update',
                members: db.party_members[code]
              });
            }
          }
        } else if (data.type === 'leave_party') {
          if (party && String(party.host_user_id) === String(userId)) {
            party.is_active = false;
            party.ended_at = new Date().toISOString();
            saveDb();
            broadcastToRoom(code, {
              type: 'party:ended',
              message: 'Host has ended the watch party session.'
            });
          } else if (db.party_members[code]) {
            const member = db.party_members[code].find(m => String(m.user_id) === String(userId));
            if (member) {
              member.online = false;
              saveDb();
              broadcastToRoom(code, {
                type: 'party:members',
                event: 'leave',
                members: db.party_members[code]
              });
            }
          }
        } else if (data.type === 'end_party') {
          if (party && String(party.host_user_id) === String(userId)) {
            party.is_active = false;
            party.ended_at = new Date().toISOString();
            saveDb();
            broadcastToRoom(code, {
              type: 'party:ended',
              message: 'Host has ended the watch party session.'
            });
          }
        }
      } catch (e) {
        console.error('WS message handling error', e);
      }
    });

    ws.on('close', () => {
      chatRateLimits.delete(ws);
      reactionRateLimits.delete(ws);

      const clients = roomClients.get(code);
      if (clients) {
        clients.delete(client);
        if (clients.size === 0) {
          roomClients.delete(code);
        }
      }

      // Check if there are other active connections for this user in this room (multi-tab or HMR reconnecting)
      const remainingClients = Array.from(clients || []);
      const userStillConnected = remainingClients.some(c => String(c.userId) === String(userId) && c.ws.readyState === WebSocket.OPEN);

      if (!userStillConnected) {
        const disconnectKey = `${code}:${userId}`;
        if (pendingDisconnects.has(disconnectKey)) {
          clearTimeout(pendingDisconnects.get(disconnectKey)!);
        }

        const timeout = setTimeout(() => {
          pendingDisconnects.delete(disconnectKey);
          if (db.party_members[code]) {
            const member = db.party_members[code].find(m => String(m.user_id) === String(userId));
            if (member) {
              member.online = false;
              member.last_seen_at = new Date().toISOString();
              saveDb();
              broadcastToRoom(code, {
                type: 'party:members',
                event: 'leave',
                members: db.party_members[code]
              });
            }
          }
        }, 2500); // 2.5-second grace period for smooth HMR / avatar / color shifts

        pendingDisconnects.set(disconnectKey, timeout);

        // Host migration logic: if host disconnects, start 30s migration timer
        const party = db.parties[code];
        if (party && String(party.host_user_id) === String(userId)) {
          if (hostDisconnectTimeouts.has(code)) {
            clearTimeout(hostDisconnectTimeouts.get(code)!);
          }

          const migrationTimer = setTimeout(() => {
            hostDisconnectTimeouts.delete(code);
            const currentParty = db.parties[code];
            if (!currentParty || !currentParty.is_active) return;

            // Check if original host has returned
            const activeClients = roomClients.get(code);
            const hostBack = Array.from(activeClients || []).some(c => String(c.userId) === String(userId));
            if (hostBack) return;

            // Promote earliest online guest to host
            const members = db.party_members[code] || [];
            const nextHost = members.find(m => m.online && String(m.user_id) !== String(userId));
            if (nextHost) {
              currentParty.host_user_id = nextHost.user_id;
              members.forEach(m => {
                m.is_host = String(m.user_id) === String(nextHost.user_id);
              });
              saveDb();

              broadcastToRoom(code, {
                type: 'host_changed',
                newHostId: nextHost.user_id,
                newHostName: nextHost.name,
                members
              });

              const sysMsg = {
                id: Date.now(),
                party_code: code,
                user_id: 'system',
                user_name: 'System',
                kind: 'system' as const,
                body: `👑 Previous host disconnected. ${nextHost.name} has been promoted to Host!`,
                created_at: new Date().toISOString()
              };
              if (!db.party_messages[code]) db.party_messages[code] = [];
              db.party_messages[code].push(sysMsg);
              broadcastToRoom(code, { type: 'party:message', message: sysMsg });
            }
          }, 30000); // 30-second host grace period

          hostDisconnectTimeouts.set(code, migrationTimer);
        }
      }
    });
  });

  // Health API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Auth APIs
  app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: db.users.length + 1,
      username,
      email,
      password: hashedPassword,
      role: db.users.length === 0 ? 'admin' : 'user',
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDb();

    const token = jwt.sign({ id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role || 'user' }
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user });
  });

  // Watch Party Creation Handler
  const handleCreateParty = (req: express.Request, res: express.Response) => {
    try {
      const clientUserId = req.body?.user_id || req.body?.id || (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
      const clientUserName = req.body?.display_name || req.body?.name || (req.headers['x-guest-name'] as string);
      const authUser = getAuthUser(req);
      const user = authUser || {
        id: clientUserId || `guest-${Date.now()}`,
        username: clientUserName ? decodeURIComponent(clientUserName) : 'Party Host',
        email: ''
      };
      
      const rawMediaId = req.body?.media_id !== undefined ? req.body.media_id : req.body?.mediaId;
      const mediaId = (rawMediaId !== undefined && rawMediaId !== null && !isNaN(Number(rawMediaId))) ? Number(rawMediaId) : 1101383;
      const mediaType = req.body?.media_type || req.body?.mediaType || 'movie';
      const title = req.body?.title || 'Watch Party';
      const season = req.body?.season !== undefined ? req.body.season : null;
      const episode = req.body?.episode !== undefined ? req.body.episode : null;
      const posterPath = req.body?.poster_path !== undefined ? req.body.poster_path : (req.body?.posterPath || null);
      const onlyHost = req.body?.only_host_controls !== undefined 
        ? !!req.body.only_host_controls 
        : (req.body?.hostOnly !== undefined ? !!req.body.hostOnly : true);

      // Generate 6-letter uppercase room code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const party = {
        id: Date.now(),
        code,
        host_user_id: user.id,
        host_name: user.username,
        media_id: mediaId,
        media_type: (mediaType === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv',
        season: season !== undefined ? season : null,
        episode: episode !== undefined ? episode : null,
        title,
        poster_path: posterPath,
        is_playing: true,
        position_seconds: 0,
        state_updated_at: new Date().toISOString(),
        server_key: null,
        version: 1,
        is_active: true,
        only_host_controls: onlyHost,
        created_at: new Date().toISOString(),
        ended_at: null
      };

      db.parties = db.parties || {};
      db.party_members = db.party_members || {};
      db.party_messages = db.party_messages || {};
      db.party_blacklists = db.party_blacklists || {};

      db.parties[code] = party;
      db.party_members[code] = [{
        id: Date.now(),
        user_id: user.id,
        name: user.username,
        avatar: '👑',
        color: '#06b6d4',
        is_host: true,
        online: true,
        joined_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      }];

      db.party_messages[code] = [{
        id: Date.now(),
        party_code: code,
        user_id: user.id,
        user_name: 'System',
        kind: 'system',
        body: `🎬 Real-Time Watch Party started for ${title}`,
        created_at: new Date().toISOString()
      }];

      saveDb();

      res.json({
        ok: true,
        code,
        party,
        room: {
          code,
          mediaId: String(mediaId),
          hostId: String(user.id),
          hostOnly: onlyHost,
          displayName: user.username,
          server_time: Date.now()
        },
        server_time: Date.now()
      });
    } catch (err: any) {
      console.error('Error creating party:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  };

  app.post('/api/party', handleCreateParty);
  app.post('/api/party/create', handleCreateParty);
  app.post('/api/watch-party/create.php', handleCreateParty);

  app.get('/api/party/mine', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.json({ parties: [], server_time: Date.now() });

    const userParties = Object.values(db.parties).filter(p => {
      if (!p.is_active) return false;
      if (String(p.host_user_id) === String(user.id)) return true;
      const members = db.party_members[p.code] || [];
      return members.some(m => String(m.user_id) === String(user.id));
    });

    res.json({ parties: userParties, server_time: Date.now() });
  });

  app.get('/api/party/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party || !party.is_active) {
      return res.status(404).json({ error: 'Watch party not found or has ended' });
    }

    const queryUserId = req.query.userId as string;
    const headerUserId = (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    const authUser = getAuthUser(req);
    const currentUserId = queryUserId || (authUser ? String(authUser.id) : (headerUserId ? String(headerUserId) : null));
    
    const isHost = currentUserId ? String(party.host_user_id) === String(currentUserId) : false;
    
    const now = Date.now();
    const lastUpdate = new Date(party.state_updated_at || now).getTime();
    const elapsed = party.is_playing ? Math.max(0, (now - lastUpdate) / 1000) : 0;
    const exactHostTime = (party.position_seconds || 0) + elapsed;

    const liveParty = {
      ...party,
      position_seconds: exactHostTime,
      server_time: now
    };

    if (!db.party_members[code]) {
      db.party_members[code] = [];
    }

    // If host is checking in, ensure host is active and marked online in members list
    if (isHost && currentUserId) {
      const hostMember = db.party_members[code].find(m => String(m.user_id) === String(currentUserId));
      if (hostMember) {
        hostMember.online = true;
        hostMember.is_host = true;
        hostMember.last_seen_at = new Date().toISOString();
      } else {
        db.party_members[code].unshift({
          id: Date.now(),
          user_id: currentUserId,
          name: party.host_name || 'Host',
          avatar: '👑',
          color: '#06b6d4',
          is_host: true,
          online: true,
          joined_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        });
      }
      saveDb();
    }

    const members = (db.party_members[code] || []).map(m => {
      const lastSeen = new Date(m.last_seen_at).getTime();
      // Keep host online if actively requesting, otherwise 60s timeout
      if (String(m.user_id) === String(currentUserId)) {
        m.online = true;
        m.last_seen_at = new Date().toISOString();
      } else if (m.online && now - lastSeen > 60000) {
        m.online = false;
      }
      return m;
    });

    res.json({
      party: liveParty,
      members,
      is_host: isHost,
      server_time: now
    });
  });

  app.post('/api/party/:code/join', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party || !party.is_active) {
      return res.status(404).json({ error: 'Watch party not found' });
    }

    const user = getAuthUser(req) || {
      id: req.body.id || `guest-${Date.now()}`,
      username: req.body.name || 'Guest',
      email: ''
    };

    // Check if user is blacklisted from this room
    const blacklists = (db as any).party_blacklists?.[code] || [];
    if (blacklists.includes(String(user.id))) {
      return res.status(403).json({ error: 'You have been removed from this watch party by the host.' });
    }

    if (!db.party_members[code]) db.party_members[code] = [];
    const members = db.party_members[code];
    let member = members.find(m => String(m.user_id) === String(user.id));

    // Room capacity limit: max 10 active viewers for free plan
    const MAX_PARTY_MEMBERS = 10;
    const activeCount = members.filter(m => m.online).length;
    if (!member && activeCount >= MAX_PARTY_MEMBERS) {
      return res.status(403).json({ error: 'This watch party is full (maximum 10 viewers allowed on free plan).' });
    }

    if (member) {
      member.online = true;
      member.last_seen_at = new Date().toISOString();
      if (req.body.avatar) member.avatar = req.body.avatar;
      if (req.body.color) member.color = req.body.color;
    } else {
      member = {
        id: Date.now(),
        user_id: user.id,
        name: user.username,
        avatar: req.body.avatar || '🍿',
        color: req.body.color || '#06b6d4',
        is_host: String(party.host_user_id) === String(user.id),
        online: true,
        joined_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      };
      members.push(member);
    }

    saveDb();

    broadcastToRoom(code, {
      type: 'party:members',
      event: 'join',
      members
    });

    res.json({ success: true, server_time: Date.now() });
  });

  app.post('/api/party/:code/leave', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    const bodyUserId = (req.body?.user_id as string) || (req.body?.id as string);
    const headerUserId = (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    const authUser = getAuthUser(req);
    const currentUserId = bodyUserId || (authUser ? String(authUser.id) : (headerUserId ? String(headerUserId) : null));
    
    if (party && currentUserId && String(party.host_user_id) === String(currentUserId)) {
      party.is_active = false;
      party.ended_at = new Date().toISOString();
      saveDb();
      broadcastToRoom(code, {
        type: 'party:ended',
        message: 'Host has ended the watch party.'
      });
    } else if (db.party_members[code] && currentUserId) {
      const member = db.party_members[code].find(m => String(m.user_id) === String(currentUserId));
      if (member) {
        member.online = false;
        saveDb();
        broadcastToRoom(code, {
          type: 'party:members',
          event: 'leave',
          members: db.party_members[code]
        });
      }
    }

    res.json({ success: true, server_time: Date.now() });
  });

  app.post('/api/party/:code/end', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    const bodyUserId = (req.body?.user_id as string) || (req.body?.id as string);
    const headerUserId = (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    const authUser = getAuthUser(req);
    const currentUserId = bodyUserId || (authUser ? String(authUser.id) : (headerUserId ? String(headerUserId) : null));
    
    if (!party) {
      return res.status(404).json({ error: 'Watch party not found' });
    }

    if (currentUserId && String(party.host_user_id) !== String(currentUserId)) {
      return res.status(403).json({ error: 'Only the host can end this watch party' });
    }

    party.is_active = false;
    party.ended_at = new Date().toISOString();
    saveDb();

    broadcastToRoom(code, {
      type: 'party:ended',
      message: 'Host has ended the watch party.'
    });

    // Close all connected sockets in this room
    const clients = roomClients.get(code);
    if (clients) {
      for (const client of clients) {
        try {
          client.ws.send(JSON.stringify({
            type: 'party:ended',
            message: 'Host has ended the watch party.'
          }));
        } catch {}
      }
    }

    res.json({ success: true, server_time: Date.now() });
  });

  // Host Moderation: Kick a user from room
  app.post('/api/party/:code/kick', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const user = getAuthUser(req);
    const isHost = user && String(party.host_user_id) === String(user.id);
    if (!isHost) {
      return res.status(403).json({ error: 'Only the host can kick participants from the room' });
    }

    const { target_user_id } = req.body;
    if (!target_user_id) return res.status(400).json({ error: 'target_user_id is required' });

    if (!db.party_members[code]) db.party_members[code] = [];
    const targetMember = db.party_members[code].find(m => String(m.user_id) === String(target_user_id));
    
    // Remove member from party
    db.party_members[code] = db.party_members[code].filter(m => String(m.user_id) !== String(target_user_id));
    
    // Add to blacklist for this party
    if (!(db as any).party_blacklists) (db as any).party_blacklists = {};
    if (!(db as any).party_blacklists[code]) (db as any).party_blacklists[code] = [];
    (db as any).party_blacklists[code].push(String(target_user_id));

    // System message
    if (!db.party_messages[code]) db.party_messages[code] = [];
    db.party_messages[code].push({
      id: Date.now(),
      party_code: code,
      user_id: user.id,
      user_name: 'System',
      kind: 'system',
      body: `👢 ${targetMember?.name || 'A viewer'} was removed from the party by the host.`,
      created_at: new Date().toISOString()
    });

    saveDb();

    // Broadcast kick to room
    broadcastToRoom(code, {
      type: 'party:kicked',
      target_user_id: String(target_user_id)
    });

    broadcastToRoom(code, {
      type: 'party:members',
      event: 'kick',
      members: db.party_members[code]
    });

    res.json({ success: true, members: db.party_members[code] });
  });

  app.post('/api/party/:code/state', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const user = getAuthUser(req);
    const isHost = user && String(party.host_user_id) === String(user.id);

    if (party.only_host_controls && !isHost) {
      return res.status(403).json({ error: 'Only the host has playback control in this room' });
    }

    const { is_playing, position_seconds, season, episode, server_key, event_type, media_id, media_type, title, poster_path, duration_seconds } = req.body;
    if (media_id !== undefined && media_id !== party.media_id) {
      party.media_id = Number(media_id);
      if (media_type) party.media_type = media_type;
      if (title) party.title = title;
      if (poster_path !== undefined) party.poster_path = poster_path;
      party.position_seconds = 0;
    }
    if (is_playing !== undefined) party.is_playing = !!is_playing;
    if (position_seconds !== undefined) party.position_seconds = Number(position_seconds);
    if (season !== undefined) party.season = season;
    if (episode !== undefined) party.episode = episode;
    if (server_key !== undefined) party.server_key = server_key;
    if (duration_seconds !== undefined && duration_seconds !== null) {
      (party as any).duration_seconds = Number(duration_seconds);
    }
    party.state_updated_at = new Date().toISOString();
    party.version += 1;

    saveDb();

    broadcastToRoom(code, {
      type: 'party:state',
      state: {
        ...party,
        event_type,
        server_time: Date.now()
      },
      trigger_user: user ? user.username : 'Someone'
    });

    res.json({ success: true, server_time: Date.now(), version: party.version });
  });

  app.post('/api/party/:code/settings', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const authUser = getAuthUser(req);
    const currentUserId = authUser?.id || (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    if (!currentUserId || String(party.host_user_id) !== String(currentUserId)) {
      return res.status(403).json({ error: 'Only host can change party settings' });
    }

    if (req.body.only_host_controls !== undefined) {
      party.only_host_controls = !!req.body.only_host_controls;
      saveDb();
      broadcastToRoom(code, {
        type: 'party:settings',
        only_host_controls: party.only_host_controls
      });
    }

    res.json({ success: true, party });
  });

  app.post('/api/party/:code/transfer-host', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party || !party.is_active) return res.status(404).json({ error: 'Party not found' });

    const authUser = getAuthUser(req);
    const currentUserId = authUser?.id || (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    const isHost = currentUserId ? String(party.host_user_id) === String(currentUserId) : false;
    if (!isHost) {
      return res.status(403).json({ error: 'Only the current host can transfer host controls' });
    }

    const { new_host_id } = req.body;
    if (!new_host_id) return res.status(400).json({ error: 'new_host_id is required' });

    const members = db.party_members[code] || [];
    const newHostMember = members.find(m => String(m.user_id) === String(new_host_id) || String(m.id) === String(new_host_id));

    if (!newHostMember) {
      return res.status(404).json({ error: 'Target participant not found in party' });
    }

    const previousHostName = party.host_name;
    const newHostName = newHostMember.name;

    party.host_user_id = newHostMember.user_id;
    party.host_name = newHostName;
    party.version = (party.version || 0) + 1;

    members.forEach(m => {
      m.is_host = String(m.user_id) === String(newHostMember.user_id);
    });

    saveDb();

    broadcastToRoom(code, {
      type: 'party:host_transferred',
      new_host_id: String(newHostMember.user_id),
      new_host_name: newHostName,
      previous_host_name: previousHostName
    });

    broadcastToRoom(code, {
      type: 'party:members_update',
      members
    });

    const sysMsg = {
      id: Date.now(),
      party_code: code,
      user_id: currentUserId,
      user_name: 'System',
      kind: 'system' as const,
      body: `👑 ${previousHostName} transferred host privileges to ${newHostName}.`,
      created_at: new Date().toISOString()
    };
    if (!db.party_messages[code]) db.party_messages[code] = [];
    db.party_messages[code].push(sysMsg);
    saveDb();
    broadcastToRoom(code, { type: 'party:message', message: sysMsg });

    return res.json({ 
      success: true, 
      new_host_id: newHostMember.user_id, 
      new_host_name: newHostName,
      version: party.version
    });
  });

  app.post('/api/party/:code/request-control', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party || !party.is_active) return res.status(404).json({ error: 'Party not found' });

    const authUser = getAuthUser(req);
    const userId = req.body?.id || (authUser ? authUser.id : ((req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string) || `guest-${Date.now()}`));
    const userName = req.body?.name || (authUser ? authUser.username : (req.headers['x-guest-name'] ? decodeURIComponent(req.headers['x-guest-name'] as string) : 'Guest'));

    if (!party.only_host_controls || String(party.host_user_id) === String(userId)) {
      return res.json({ success: true, granted: true, message: 'Controls are already open' });
    }

    broadcastToRoom(code, {
      type: 'control_requested',
      requesterId: String(userId),
      requesterName: userName,
      requesterAvatar: req.body?.avatar || '🍿',
      ts: Date.now()
    });

    const sysMsg = {
      id: Date.now(),
      party_code: code,
      user_id: userId,
      user_name: 'System',
      kind: 'system' as const,
      body: `🙋 ${userName} requested control of the player.`,
      created_at: new Date().toISOString()
    };
    if (!db.party_messages[code]) db.party_messages[code] = [];
    db.party_messages[code].push(sysMsg);
    saveDb();
    broadcastToRoom(code, { type: 'party:message', message: sysMsg });

    res.json({ success: true, server_time: Date.now() });
  });

  app.post('/api/party/:code/respond-control', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party || !party.is_active) return res.status(404).json({ error: 'Party not found' });

    const authUser = getAuthUser(req);
    const currentUserId = authUser?.id || (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    const isHost = currentUserId ? String(party.host_user_id) === String(currentUserId) : false;
    if (!isHost) {
      return res.status(403).json({ error: 'Only the host can approve control requests' });
    }

    const { requester_id, approved } = req.body;
    if (!requester_id) return res.status(400).json({ error: 'requester_id is required' });

    const targetMember = db.party_members[code]?.find(m => String(m.user_id) === String(requester_id));
    const targetName = targetMember?.name || 'Viewer';

    if (approved) {
      party.only_host_controls = false;
      saveDb();

      broadcastToRoom(code, {
        type: 'party:settings',
        only_host_controls: false
      });

      broadcastToRoom(code, {
        type: 'control_granted',
        requesterId: String(requester_id),
        requesterName: targetName,
        ts: Date.now()
      });

      const sysMsg = {
        id: Date.now(),
        party_code: code,
        user_id: currentUserId,
        user_name: 'System',
        kind: 'system' as const,
        body: `🎮 Host approved player control! Shared controls are now unlocked for ${targetName}.`,
        created_at: new Date().toISOString()
      };
      if (!db.party_messages[code]) db.party_messages[code] = [];
      db.party_messages[code].push(sysMsg);
      saveDb();
      broadcastToRoom(code, { type: 'party:message', message: sysMsg });

      return res.json({ success: true, approved: true, only_host_controls: false });
    } else {
      broadcastToRoom(code, {
        type: 'control_declined',
        requesterId: String(requester_id),
        ts: Date.now()
      });

      const sysMsg = {
        id: Date.now(),
        party_code: code,
        user_id: currentUserId,
        user_name: 'System',
        kind: 'system' as const,
        body: `🔒 Host kept controls locked to Host Only.`,
        created_at: new Date().toISOString()
      };
      if (!db.party_messages[code]) db.party_messages[code] = [];
      db.party_messages[code].push(sysMsg);
      saveDb();
      broadcastToRoom(code, { type: 'party:message', message: sysMsg });

      return res.json({ success: true, approved: false, only_host_controls: true });
    }
  });

  app.get('/api/party/:code/sync', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party || !party.is_active) {
      return res.status(200).json({ 
        ended: true, 
        message: 'Watch party has ended', 
        server_time: Date.now() 
      });
    }

    // Update the requesting member's last seen & online status
    const authUser = getAuthUser(req);
    const userId = authUser ? String(authUser.id) : (req.query.userId as string);
    if (userId && db.party_members[code]) {
      const member = db.party_members[code].find(m => String(m.user_id) === String(userId));
      if (member) {
        member.online = true;
        member.last_seen_at = new Date().toISOString();
        saveDb();
      }
    }

    // Dynamic sweep: mark members as offline if not seen in 12 seconds
    const now = Date.now();
    const members = (db.party_members[code] || []).map(m => {
      const lastSeen = new Date(m.last_seen_at).getTime();
      if (m.online && now - lastSeen > 12000) {
        m.online = false;
      }
      return m;
    });

    const sinceVersion = Number(req.query.since_version || 0);
    const sinceMessageId = Number(req.query.since_message_id || 0);

    const allMessages = db.party_messages[code] || [];
    const newMessages = allMessages.filter(m => m.id > sinceMessageId);

    const isUnchanged = party.version <= sinceVersion && newMessages.length === 0;

    res.json({
      unchanged: isUnchanged,
      version: party.version,
      state: {
        is_playing: party.is_playing,
        position_seconds: party.position_seconds,
        state_updated_at: party.state_updated_at,
        season: party.season,
        episode: party.episode,
        server_key: party.server_key,
        only_host_controls: party.only_host_controls,
        server_time: Date.now()
      },
      members,
      messages: newMessages,
      server_time: Date.now()
    });
  });

  app.post('/api/party/:code/message', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const user = getAuthUser(req) || { id: 'guest', username: 'Guest', email: '' };
    const { body, user_avatar, user_color } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Message body cannot be empty' });

    const msg = {
      id: Date.now(),
      party_code: code,
      user_id: user.id,
      user_name: user.username,
      user_avatar: user_avatar || '🍿',
      user_color: user_color || '#06b6d4',
      kind: 'chat' as const,
      body: body.trim().slice(0, 500),
      created_at: new Date().toISOString()
    };

    if (!db.party_messages[code]) db.party_messages[code] = [];
    db.party_messages[code].push(msg);
    saveDb();

    broadcastToRoom(code, {
      type: 'party:message',
      message: msg
    });

    res.json({ success: true, server_time: Date.now() });
  });

  app.post('/api/party/:code/reaction', (req, res) => {
    const code = req.params.code.toUpperCase();
    const party = db.parties[code];
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const user = getAuthUser(req) || { id: 'guest', username: 'Guest', email: '' };
    const { emoji, user_avatar } = req.body;

    broadcastToRoom(code, {
      type: 'party:reaction',
      emoji: emoji || '❤️',
      user_name: user.username,
      user_avatar: user_avatar || '🍿'
    });

    res.json({ success: true, server_time: Date.now() });
  });

  // Additional App APIs (Watchlist, Progress, Settings, Notifications, Search History)
  app.get('/api/settings', (req, res) => {
    res.json(db.settings || {});
  });

  app.post('/api/settings', (req, res) => {
    db.settings = { ...db.settings, ...req.body };
    saveDb();
    res.json(db.settings);
  });

  app.get('/api/watchlist', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.json([]);
    const list = db.watchlist.filter(w => w.user_id === user.id);
    res.json(list);
  });

  app.post('/api/watchlist', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { media_id, media_type, title, poster_path } = req.body;
    const existing = db.watchlist.find(w => w.user_id === user.id && w.media_id === media_id);
    if (!existing) {
      db.watchlist.push({
        id: Date.now(),
        user_id: user.id,
        media_id,
        media_type,
        title,
        poster_path,
        added_at: new Date().toISOString()
      });
      saveDb();
    }
    res.json({ success: true });
  });

  app.delete('/api/watchlist/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const mediaId = Number(req.params.id);
    db.watchlist = db.watchlist.filter(w => !(w.user_id === user.id && (w.media_id === mediaId || w.id === mediaId)));
    saveDb();
    res.json({ success: true });
  });

  app.get('/api/progress', (req, res) => {
    const authUser = getAuthUser(req);
    const userId = authUser?.id || (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    if (!userId) return res.json([]);
    const items = db.progress.filter(p => String(p.user_id) === String(userId));
    res.json(items);
  });

  app.post('/api/progress', (req, res) => {
    const authUser = getAuthUser(req);
    const userId = authUser?.id || (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string) || 'guest-anon';
    const { 
      media_id, 
      media_type, 
      season, 
      episode, 
      progress_seconds, 
      duration_seconds,
      title,
      poster_path,
      backdrop_path,
      overview,
      episode_title
    } = req.body;

    const item = db.progress.find(p => 
      String(p.user_id) === String(userId) && 
      p.media_id === media_id && 
      (media_type === 'movie' || (p.season === season && p.episode === episode))
    );

    if (item) {
      item.progress_seconds = progress_seconds;
      item.duration_seconds = duration_seconds;
      item.last_watched = new Date().toISOString();
      if (title) item.title = title;
      if (poster_path) item.poster_path = poster_path;
      if (backdrop_path) item.backdrop_path = backdrop_path;
      if (overview) item.overview = overview;
      if (episode_title) item.episode_title = episode_title;
    } else {
      db.progress.push({
        id: Date.now(),
        user_id: userId,
        media_id,
        media_type: media_type || 'movie',
        season,
        episode,
        progress_seconds,
        duration_seconds,
        title,
        poster_path,
        backdrop_path,
        overview,
        episode_title,
        last_watched: new Date().toISOString()
      });
    }
    saveDb();
    res.json({ success: true });
  });

  app.delete('/api/progress/:id', (req, res) => {
    const authUser = getAuthUser(req);
    const userId = authUser?.id || (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const mediaId = Number(req.params.id);
    db.progress = db.progress.filter(p => !(String(p.user_id) === String(userId) && (p.media_id === mediaId || p.id === mediaId)));
    saveDb();
    res.json({ success: true });
  });

  app.delete('/api/progress', (req, res) => {
    const authUser = getAuthUser(req);
    const userId = authUser?.id || (req.headers['x-user-id'] as string) || (req.headers['x-guest-id'] as string);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    db.progress = db.progress.filter(p => String(p.user_id) !== String(userId));
    saveDb();
    res.json({ success: true });
  });

  app.get('/api/notifications', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.json([]);
    const notifs = db.notifications.filter(n => n.user_id === user.id);
    res.json(notifs);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const user = getAuthUser(req);
    if (user) {
      const id = Number(req.params.id);
      const notif = db.notifications.find(n => n.user_id === user.id && n.id === id);
      if (notif) notif.is_read = true;
      saveDb();
    }
    res.json({ success: true });
  });

  app.put('/api/notifications/read-all', (req, res) => {
    const user = getAuthUser(req);
    if (user) {
      db.notifications.filter(n => n.user_id === user.id).forEach(n => { n.is_read = true; });
      saveDb();
    }
    res.json({ success: true });
  });

  app.get('/api/search-history', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.json([]);
    const items = db.search_history.filter(s => s.user_id === user.id);
    res.json(items);
  });

  app.post('/api/search-history', (req, res) => {
    const user = getAuthUser(req);
    if (user) {
      const { media_id, item_json } = req.body;
      db.search_history = db.search_history.filter(s => !(s.user_id === user.id && s.media_id === media_id));
      db.search_history.unshift({
        id: Date.now(),
        user_id: user.id,
        media_id,
        item_json: typeof item_json === 'string' ? item_json : JSON.stringify(item_json),
        created_at: new Date().toISOString()
      });
      if (db.search_history.length > 20) db.search_history = db.search_history.slice(0, 20);
      saveDb();
    }
    res.json({ success: true });
  });

  app.delete('/api/search-history/:id', (req, res) => {
    const user = getAuthUser(req);
    if (user) {
      const id = Number(req.params.id);
      db.search_history = db.search_history.filter(s => !(s.user_id === user.id && s.id === id));
      saveDb();
    }
    res.json({ success: true });
  });

  // Media Sources APIs
  app.get('/api/sources/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const mediaId = Number(id);
    const season = req.query.season ? Number(req.query.season) : 0;
    const episode = req.query.episode ? Number(req.query.episode) : 0;

    const filtered = db.sources.filter(s => 
      s.media_type === type &&
      s.media_id === mediaId &&
      s.is_active &&
      (s.season || 0) === season &&
      (s.episode || 0) === episode
    );

    filtered.sort((a, b) => b.priority - a.priority || a.id - b.id);
    res.json({ sources: filtered });
  });

  // =========================================================================
  // Friends & Direct Messaging APIs
  // =========================================================================

  // Search users or recent watch party members to add as friend
  app.get('/api/users/search', (req, res) => {
    const q = (req.query.q as string || '').trim().toLowerCase();
    const currentUser = getAuthUser(req);
    const currentUserId = currentUser ? String(currentUser.id) : null;

    let userMatches: Array<{ id: string | number; username: string; email?: string; avatar?: string; source: string }> = [];

    // Registered users
    if (db.users) {
      db.users.forEach(u => {
        if (currentUserId && String(u.id) === currentUserId) return;
        if (!q || u.username.toLowerCase().includes(q)) {
          userMatches.push({
            id: u.id,
            username: u.username,
            avatar: '🍿',
            source: 'registered'
          });
        }
      });
    }

    // Recent party members
    if (db.party_members) {
      Object.values(db.party_members).forEach(members => {
        members.forEach(m => {
          if (currentUserId && String(m.user_id) === currentUserId) return;
          if (userMatches.some(u => String(u.id) === String(m.user_id))) return;
          if (!q || m.name.toLowerCase().includes(q)) {
            userMatches.push({
              id: m.user_id,
              username: m.name,
              avatar: m.avatar || '🍿',
              source: 'party'
            });
          }
        });
      });
    }

    res.json(userMatches.slice(0, 20));
  });

  // Search a registered user specifically by registered email address
  app.get('/api/friends/search-email', (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
    }
    const currentUserId = String(authUser.id);

    const emailQuery = (req.query.email as string || '').trim().toLowerCase();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailQuery || !emailRegex.test(emailQuery)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Find the registered user matching this email exactly
    const targetUser = db.users.find(u => u.email.toLowerCase() === emailQuery);
    if (!targetUser) {
      return res.status(404).json({ error: 'No registered account found' });
    }

    const targetUserId = String(targetUser.id);

    // Determine friendship/request status
    let friendshipStatus: 'self' | 'accepted' | 'pending' | 'rejected' | 'none' = 'none';
    let requestId: number | null = null;

    if (targetUserId === currentUserId) {
      friendshipStatus = 'self';
    } else {
      // Check if already friends
      const isFriend = (db.friends || []).some(
        f => (String(f.user_id_1) === currentUserId && String(f.user_id_2) === targetUserId) ||
             (String(f.user_id_2) === currentUserId && String(f.user_id_1) === targetUserId)
      );

      if (isFriend) {
        friendshipStatus = 'accepted';
      } else {
        // Check for friend requests
        const reqExist = (db.friend_requests || []).find(
          r => (String(r.sender_id) === currentUserId && String(r.receiver_id) === targetUserId) ||
               (String(r.receiver_id) === currentUserId && String(r.sender_id) === targetUserId)
        );

        if (reqExist) {
          friendshipStatus = reqExist.status === 'declined' ? 'rejected' : reqExist.status; // maps 'declined' -> 'rejected'
          requestId = reqExist.id;
        }
      }
    }

    return res.json({
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        avatar: '🍿',
      },
      friendship_status: friendshipStatus,
      request_id: requestId
    });
  });

  // Get friends list & pending requests
  app.get('/api/friends', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.json({ friends: [], requests_received: [], requests_sent: [] });
    const currentUserId = String(user.id);

    // Find all friend entries where user is user_id_1 or user_id_2
    const friendRelations = (db.friends || []).filter(
      f => String(f.user_id_1) === currentUserId || String(f.user_id_2) === currentUserId
    );

    const friendsList = friendRelations.map(f => {
      const friendId = String(f.user_id_1) === currentUserId ? String(f.user_id_2) : String(f.user_id_1);
      
      // Look up in registered users or party members
      const regUser = db.users.find(u => String(u.id) === friendId);
      let name = regUser ? regUser.username : 'Friend';
      let avatar = '🍿';
      let isOnline = false;

      // Check if online in any party
      if (db.party_members) {
        for (const members of Object.values(db.party_members)) {
          const pm = members.find(m => String(m.user_id) === friendId);
          if (pm) {
            name = pm.name || name;
            avatar = pm.avatar || avatar;
            if (pm.online) isOnline = true;
          }
        }
      }

      // Check unread message count from this friend
      const unreadCount = (db.direct_messages || []).filter(
        dm => String(dm.sender_id) === friendId && String(dm.receiver_id) === currentUserId && !dm.is_read
      ).length;

      // Last message
      const lastMsg = (db.direct_messages || []).filter(
        dm => (String(dm.sender_id) === currentUserId && String(dm.receiver_id) === friendId) ||
              (String(dm.sender_id) === friendId && String(dm.receiver_id) === currentUserId)
      ).pop();

      return {
        id: friendId,
        username: name,
        avatar,
        is_online: isOnline,
        unread_count: unreadCount,
        last_message: lastMsg ? lastMsg.body : undefined,
        last_message_at: lastMsg ? lastMsg.created_at : f.created_at
      };
    });

    const requestsReceived = (db.friend_requests || []).filter(
      r => String(r.receiver_id) === currentUserId && r.status === 'pending'
    );

    const requestsSent = (db.friend_requests || []).filter(
      r => String(r.sender_id) === currentUserId && r.status === 'pending'
    );

    res.json({
      friends: friendsList,
      requests_received: requestsReceived,
      requests_sent: requestsSent
    });
  });

  // Send friend request
  app.post('/api/friends/request', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const currentUserId = String(user.id);

    const { target_id, target_username } = req.body;
    let recipient: { id: string | number; name: string; avatar?: string } | null = null;

    if (target_id) {
      const regUser = db.users.find(u => String(u.id) === String(target_id));
      if (regUser) {
        recipient = { id: regUser.id, name: regUser.username, avatar: '🍿' };
      } else {
        if (db.party_members) {
          for (const members of Object.values(db.party_members)) {
            const pm = members.find(m => String(m.user_id) === String(target_id));
            if (pm) {
              recipient = { id: pm.user_id, name: pm.name, avatar: pm.avatar };
              break;
            }
          }
        }
      }
    } else if (target_username) {
      const regUser = db.users.find(u => u.username.toLowerCase() === target_username.toLowerCase().trim());
      if (regUser) {
        recipient = { id: regUser.id, name: regUser.username, avatar: '🍿' };
      }
    }

    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (String(recipient.id) === currentUserId) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend' });
    }

    // Check if already friends
    const alreadyFriends = (db.friends || []).some(
      f => (String(f.user_id_1) === currentUserId && String(f.user_id_2) === String(recipient!.id)) ||
           (String(f.user_id_2) === currentUserId && String(f.user_id_1) === String(recipient!.id))
    );
    if (alreadyFriends) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    // Check if pending request exists
    const existingReq = (db.friend_requests || []).find(
      r => (String(r.sender_id) === currentUserId && String(r.receiver_id) === String(recipient!.id) && r.status === 'pending') ||
           (String(r.receiver_id) === currentUserId && String(r.sender_id) === String(recipient!.id) && r.status === 'pending')
    );
    if (existingReq) {
      return res.status(400).json({ error: 'Friend request already pending' });
    }

    const newReq = {
      id: Date.now(),
      sender_id: currentUserId,
      sender_name: user.username,
      sender_avatar: req.body.user_avatar || '🍿',
      receiver_id: recipient.id,
      receiver_name: recipient.name,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.friend_requests.push(newReq);
    saveDb();

    return res.json({ success: true, request: newReq, message: `Friend request sent to ${recipient.name}!` });
  });

  // Respond to friend request (accept or decline)
  app.post('/api/friends/respond', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const currentUserId = String(user.id);

    const { request_id, action } = req.body;
    const request = (db.friend_requests || []).find(r => r.id === Number(request_id) && String(r.receiver_id) === currentUserId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (action === 'accept') {
      request.status = 'accepted';
      (request as any).updated_at = new Date().toISOString();
      db.friends.push({
        id: Date.now(),
        user_id_1: request.sender_id,
        user_id_2: request.receiver_id,
        created_at: new Date().toISOString()
      });

      // Add a notification to the sender of the request
      db.notifications = db.notifications || [];
      db.notifications.push({
        id: Date.now(),
        user_id: request.sender_id as any,
        title: '👥 Friend Request Accepted!',
        message: `${user.username} accepted your friend request! You can now start chatting and inviting them to watch parties.`,
        is_read: false,
        created_at: new Date().toISOString()
      });

      saveDb();
      return res.json({ success: true, message: `Friend request accepted!` });
    } else {
      request.status = action === 'reject' || action === 'rejected' ? 'rejected' : 'declined';
      (request as any).updated_at = new Date().toISOString();
      saveDb();
      return res.json({ success: true, message: `Friend request declined.` });
    }
  });

  // Invite a friend to a Watch Party
  app.post('/api/friends/invite-party', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const currentUserId = String(user.id);

    const { friend_id, party_code, media_title } = req.body;
    if (!friend_id || !party_code) {
      return res.status(400).json({ error: 'friend_id and party_code are required' });
    }

    // Verify friendship exists
    const isFriend = (db.friends || []).some(
      f => (String(f.user_id_1) === currentUserId && String(f.user_id_2) === String(friend_id)) ||
           (String(f.user_id_2) === currentUserId && String(f.user_id_1) === String(friend_id))
    );
    if (!isFriend) {
      return res.status(403).json({ error: 'You can only invite mutual friends to a watch party.' });
    }

    // Look up friend to send notification
    const targetFriendId = isNaN(Number(friend_id)) ? friend_id : Number(friend_id);

    // Create Watch Party Invitation Notification
    db.notifications = db.notifications || [];
    const invitationNotif = {
      id: Date.now(),
      user_id: targetFriendId as any,
      title: '🍿 Watch Party Invitation',
      message: `${user.username} invited you to join a Watch Party${media_title ? ` for "${media_title}"` : ''}! Join room: ${party_code}`,
      is_read: false,
      created_at: new Date().toISOString()
    };

    db.notifications.push(invitationNotif);
    saveDb();

    res.json({ success: true, message: 'Watch party invitation sent successfully!' });
  });

  // Delete friend
  app.delete('/api/friends/:friendId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const currentUserId = String(user.id);
    const friendId = String(req.params.friendId);

    db.friends = (db.friends || []).filter(
      f => !( (String(f.user_id_1) === currentUserId && String(f.user_id_2) === friendId) ||
              (String(f.user_id_2) === currentUserId && String(f.user_id_1) === friendId) )
    );
    saveDb();
    res.json({ success: true });
  });

  // Get direct messages with a friend
  app.get('/api/messages/:friendId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.json({ messages: [] });
    const currentUserId = String(user.id);
    const friendId = String(req.params.friendId);

    // Mark messages from friend as read
    let updated = false;
    (db.direct_messages || []).forEach(dm => {
      if (String(dm.sender_id) === friendId && String(dm.receiver_id) === currentUserId && !dm.is_read) {
        dm.is_read = true;
        updated = true;
      }
    });
    if (updated) saveDb();

    const thread = (db.direct_messages || []).filter(
      dm => (String(dm.sender_id) === currentUserId && String(dm.receiver_id) === friendId) ||
            (String(dm.sender_id) === friendId && String(dm.receiver_id) === currentUserId)
    );

    thread.sort((a, b) => a.id - b.id);
    res.json({ messages: thread });
  });

  // Send direct message
  app.post('/api/messages/:friendId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const currentUserId = String(user.id);
    const friendId = String(req.params.friendId);
    const { body, user_avatar } = req.body;

    if (!body || !body.trim()) return res.status(400).json({ error: 'Message body cannot be empty' });

    let friendName = 'Friend';
    const regUser = db.users.find(u => String(u.id) === friendId);
    if (regUser) friendName = regUser.username;

    const newMsg = {
      id: Date.now(),
      sender_id: currentUserId,
      sender_name: user.username,
      sender_avatar: user_avatar || '🍿',
      receiver_id: friendId,
      receiver_name: friendName,
      body: body.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    };

    db.direct_messages.push(newMsg);
    saveDb();

    // Broadcast DM via WebSockets
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'dm_message',
          message: newMsg
        }));
      }
    });

    res.json({ success: true, message: newMsg });
  });

  app.post('/api/sources', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { media_id, media_type, season, episode, server_key, source, quality, language, priority } = req.body;
    if (!media_id || !media_type || !server_key || !source) {
      return res.status(400).json({ error: 'media_id, media_type, server_key, and source are required' });
    }

    const seasonVal = season ? Number(season) : null;
    const epVal = episode ? Number(episode) : null;

    // Check unique constraint
    const existing = db.sources.find(s => 
      s.media_id === Number(media_id) &&
      s.media_type === media_type &&
      s.season === seasonVal &&
      s.episode === epVal &&
      s.server_key === server_key &&
      s.source === source
    );

    if (existing) {
      existing.quality = quality ?? null;
      existing.language = language ?? null;
      existing.priority = priority !== undefined ? Number(priority) : 0;
      existing.is_active = true;
      saveDb();
      return res.json(existing);
    }

    const newSource = {
      id: db.sources.length ? Math.max(...db.sources.map(s => s.id)) + 1 : 1,
      media_id: Number(media_id),
      media_type: media_type as 'movie' | 'tv',
      season: seasonVal,
      episode: epVal,
      server_key,
      source,
      quality: quality ?? null,
      language: language ?? null,
      is_active: true,
      priority: priority !== undefined ? Number(priority) : 0,
      reports: 0,
      added_by: user.id,
      created_at: new Date().toISOString()
    };

    db.sources.push(newSource);
    saveDb();
    res.json(newSource);
  });

  app.put('/api/sources/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = Number(req.params.id);
    const source = db.sources.find(s => s.id === id);
    if (!source) return res.status(404).json({ error: 'Source not found' });

    const { is_active, priority, quality, language } = req.body;
    if (is_active !== undefined) source.is_active = !!is_active;
    if (priority !== undefined) source.priority = Number(priority);
    if (quality !== undefined) source.quality = quality ?? null;
    if (language !== undefined) source.language = language ?? null;

    saveDb();
    res.json({ success: true, source });
  });

  app.delete('/api/sources/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = Number(req.params.id);
    db.sources = db.sources.filter(s => s.id !== id);
    saveDb();
    res.json({ success: true });
  });

  app.post('/api/sources/report', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { source_id } = req.body;
    if (!source_id) return res.status(400).json({ error: 'source_id is required' });

    const source = db.sources.find(s => s.id === Number(source_id));
    if (!source) return res.status(404).json({ error: 'Source not found' });

    source.reports = (source.reports || 0) + 1;
    if (source.reports >= 5) {
      source.is_active = false;
    }
    saveDb();
    res.json({ success: true });
  });

  // Mount Vite middleware or static dist server
  const distPath = path.join(process.cwd(), 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(distIndexPath);

  if (process.env.NODE_ENV === 'production' && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(distIndexPath);
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
