import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Send, Crown, AlertCircle, Copy, Check, Volume2, VolumeX, 
  Settings, Shield, Sparkles, MessageSquare, Play, Pause, LogOut,
  UserX, Share2, User, X, LogIn, ChevronRight, Gamepad2, Loader2, Clock, UserPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import type { WatchParty, PartyMember, PartyMessage } from '../../types/party';
import type { Media } from '../../types';
import { PARTY_AVATARS, PARTY_COLORS, partySounds, getStoredUserAvatar, getStoredUserColor } from '../../utils/partyAvatars';
import { partyApi } from '../../services/partyApi';
import { RecentPartiesSection } from './RecentPartiesSection';
import { saveRecentParty } from '../../utils/recentParties';
import { useRecentParties } from '../../hooks/useRecentParties';
import { apiFetch } from '../../services/api';
import { DirectMessageModal } from '../DirectMessageModal';

export interface WatchPartySidebarProps {
  // Current media for creating a new room
  media?: Media | null;
  season?: number;
  episode?: number;

  // Real-time room session state
  party?: WatchParty | null;
  partyCode?: string | null;
  members?: PartyMember[];
  messages?: PartyMessage[];
  isHost?: boolean;
  driftSeconds?: number;
  hostPaused?: boolean;
  userAvatar?: string;
  userColor?: string;
  typingUsers?: string[];
  onlyHostControls?: boolean;

  // Control request feature
  onRequestControl?: () => void;
  isControlRequestPending?: boolean;
  controlRequests?: Array<{ requesterId: string | number; requesterName: string; requesterAvatar?: string; ts: number }>;
  onGrantControl?: (requesterId: string | number) => void;
  onDeclineControl?: (requesterId: string | number) => void;
  controlFeedback?: string | null;
  onDismissFeedback?: () => void;

  // Real-time actions
  onClose?: () => void;
  onLeave?: () => void;
  onEndParty?: () => void;
  onSendMessage?: (body: string) => void;
  onSendReaction?: (emoji: string) => void;
  onSendTyping?: () => void;
  onResync?: () => void;
  onKickMember?: (userId: string | number) => void;
  onUpdateSettings?: (settings: { only_host_controls?: boolean }) => void;
  onTransferHost?: (newHostId: string | number) => void;
  onSetAvatar?: (avatar: string) => void;
  onSetColor?: (color: string) => void;

  // Setup callbacks
  onPartyCreated?: (code: string) => void;
}

const EMOJIS = ['🍿', '🔥', '😂', '😱', '❤️', '👏', '🎉', '🚀'];

export function WatchPartySidebar({
  media,
  season,
  episode,
  party,
  partyCode,
  members = [],
  messages = [],
  isHost = false,
  driftSeconds = 0,
  hostPaused = false,
  userAvatar: propAvatar,
  userColor: propColor,
  typingUsers = [],
  onlyHostControls = true,
  onRequestControl,
  isControlRequestPending = false,
  controlRequests = [],
  onGrantControl,
  onDeclineControl,
  controlFeedback = null,
  onDismissFeedback,
  onClose,
  onLeave,
  onEndParty,
  onSendMessage,
  onSendReaction,
  onSendTyping,
  onResync,
  onKickMember,
  onUpdateSettings,
  onTransferHost,
  onSetAvatar,
  onSetColor,
  onPartyCreated,
}: WatchPartySidebarProps) {
  const navigate = useNavigate();
  const isRoomActive = Boolean(partyCode);

  // Setup state (pre-party)
  const [setupTab, setSetupTab] = useState<'create' | 'join' | 'recent'>('create');
  const { parties: recentParties } = useRecentParties();
  const [setupOnlyHostControls, setSetupOnlyHostControls] = useState<boolean>(true);
  const [displayName, setDisplayName] = useState<string>(() => {
    try {
      const userStr = localStorage.getItem('mondoflix_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.username) return u.username;
      }
      return localStorage.getItem('mondoflix_guest_name') || '';
    } catch {
      return '';
    }
  });
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Active room state
  const activeCode = party?.code || partyCode || '';
  const activeTitle = party?.title || media?.title || media?.name || 'Watch Party Room';
  const [msgInput, setMsgInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'recent' | 'settings'>('chat');
  const [soundEnabled, setSoundEnabled] = useState(() => partySounds.isEnabled());
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [mutedUsers, setMutedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mondoflix_muted_users') || '[]');
    } catch {
      return [];
    }
  });
  const [kickConfirmId, setKickConfirmId] = useState<string | number | null>(null);
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [targetFriendId, setTargetFriendId] = useState<string | null>(null);
  const [friendNotice, setFriendNotice] = useState<string | null>(null);

  const handleAddFriend = async (targetId: string | number, targetName: string) => {
    try {
      const res = await apiFetch('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ target_id: targetId })
      });
      if (res && res.message) {
        setFriendNotice(res.message);
        setTimeout(() => setFriendNotice(null), 3000);
      }
    } catch (err: any) {
      setFriendNotice(err?.message || 'Failed to send request');
      setTimeout(() => setFriendNotice(null), 3000);
    }
  };

  const localAvatar = propAvatar || getStoredUserAvatar();
  const localColor = propColor || getStoredUserColor();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRoomActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers, isRoomActive]);

  const saveDisplayName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      localStorage.setItem('mondoflix_guest_name', trimmed);
    }
  };

  // Start Watch Party (Creation using the JSON state management schema)
  const handleStartWatchParty = async () => {
    setIsLoading(true);
    setSetupError(null);
    saveDisplayName(displayName);

    try {
      const activeMedia = media || { id: 1101383, title: 'Watch Party Lobby', media_type: 'movie', poster_path: null };
      let mType = (activeMedia.media_type as string) || 'movie';
      
      if (!mType || mType === 'home') {
        if (window.location.pathname.includes('/watch/tv/')) {
          mType = 'tv';
        } else if (window.location.pathname.includes('/watch/movie/')) {
          mType = 'movie';
        } else if (media?.name) {
          mType = 'tv';
        } else {
          mType = 'movie';
        }
      }

      const inferredTitle = activeMedia.title || media?.name || 'Watch Party';

      // JSON state management schema payload
      const payload = {
        media_id: activeMedia.id || 1101383,
        media_type: mType as 'movie' | 'tv',
        season: season || null,
        episode: episode || null,
        title: inferredTitle,
        poster_path: activeMedia.poster_path || null,
        only_host_controls: setupOnlyHostControls,
        display_name: displayName.trim() || undefined
      };

      const res = await partyApi.create(payload);
      sessionStorage.setItem('active_party_code', res.code);

      saveRecentParty({
        code: res.code,
        title: inferredTitle,
        mediaId: activeMedia.id || 1101383,
        mediaType: mType as 'movie' | 'tv',
        season: season || null,
        episode: episode || null,
        posterPath: activeMedia.poster_path || null,
        isHost: true,
        isActive: true,
        lastJoinedAt: Date.now()
      });

      if (onPartyCreated) {
        onPartyCreated(res.code);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set('party', res.code);
        navigate(url.pathname + url.search);
      }
    } catch (err: any) {
      console.error('Failed to start watch party:', err);
      setSetupError(err.message || 'Failed to start watch party. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Join Watch Party with code
  const handleJoinWatchParty = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setSetupError('Please enter a valid 6-letter party code');
      return;
    }

    setIsLoading(true);
    setSetupError(null);
    saveDisplayName(displayName);

    try {
      const res = await partyApi.get(cleanCode);
      const fetchedParty = res.party;
      sessionStorage.setItem('active_party_code', fetchedParty.code);

      saveRecentParty({
        code: fetchedParty.code,
        title: fetchedParty.title || 'Watch Party',
        mediaId: fetchedParty.media_id,
        mediaType: fetchedParty.media_type as 'movie' | 'tv',
        season: fetchedParty.season,
        episode: fetchedParty.episode,
        posterPath: fetchedParty.poster_path,
        hostName: fetchedParty.host_name,
        isHost: res.is_host,
        isActive: fetchedParty.is_active,
        lastJoinedAt: Date.now()
      });

      let url = `/watch/${fetchedParty.media_type}/${fetchedParty.media_id}`;
      if (fetchedParty.media_type === 'tv' && fetchedParty.season && fetchedParty.episode) {
        url += `/season/${fetchedParty.season}/episode/${fetchedParty.episode}`;
      }
      url += `?party=${fetchedParty.code}`;

      navigate(url);
    } catch (err: any) {
      setSetupError(err.message || 'Could not find watch party. Please verify the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPartyCode = () => {
    if (!activeCode) return;
    navigator.clipboard.writeText(activeCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sharePartyLink = async () => {
    if (!activeCode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('party', activeCode);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Watch Party: ${activeTitle}`,
          text: `Join my watch party on Mondoflix to watch together in real-time sync:`,
          url: url.toString()
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleSound = () => {
    const next = partySounds.toggle();
    setSoundEnabled(next);
  };

  const toggleMute = (userId: string | number) => {
    const sId = String(userId);
    setMutedUsers(prev => {
      const next = prev.includes(sId) ? prev.filter(x => x !== sId) : [...prev, sId];
      try {
        localStorage.setItem('mondoflix_muted_users', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (msgInput.trim()) {
      onSendMessage?.(msgInput.trim());
      setMsgInput('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsgInput(e.target.value);
    onSendTyping?.();
  };

  const visibleMessages = messages.filter(m => m.kind === 'system' || !mutedUsers.includes(String(m.user_id)));

  // ==========================================
  // RENDER 1: SETUP MODE (No Active Party Room)
  // ==========================================
  if (!isRoomActive) {
    return (
      <div className="flex flex-col h-full bg-[#070E1B] border-l border-white/10 w-full shadow-2xl relative select-none">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-white">Watch Party</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  REAL-TIME
                </span>
              </div>
              <p className="text-xs text-slate-400">Watch together with synchronized video & live chat</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Toggle: Start Party vs Join Party vs Recent */}
        <div className="flex border-b border-white/10 bg-slate-950/40 text-xs font-bold uppercase tracking-wider">
          <button 
            className={`flex-1 py-3 transition-colors cursor-pointer ${setupTab === 'create' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setSetupTab('create')}
          >
            Start
          </button>
          <button 
            className={`flex-1 py-3 transition-colors cursor-pointer ${setupTab === 'join' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setSetupTab('join')}
          >
            Join
          </button>
          <button 
            className={`flex-1 py-3 transition-colors flex items-center justify-center gap-1 cursor-pointer ${setupTab === 'recent' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setSetupTab('recent')}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recent</span>
            {recentParties.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                {recentParties.length}
              </span>
            )}
          </button>
        </div>

        {/* Setup Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {setupError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{setupError}</span>
            </div>
          )}

          {setupTab === 'create' ? (
            <div className="space-y-4">
              {/* Media Preview Card */}
              {media ? (
                <div className="flex gap-3 items-center p-3 bg-white/5 rounded-2xl border border-white/10">
                  {media.poster_path ? (
                    <img 
                      src={`https://image.tmdb.org/t/p/w92${media.poster_path}`} 
                      alt="" 
                      className="w-12 h-16 object-cover rounded-xl shadow-md border border-white/10" 
                    />
                  ) : (
                    <div className="w-12 h-16 bg-white/10 rounded-xl flex items-center justify-center text-slate-400">
                      <Users className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-white line-clamp-1">{media.title || media.name}</h3>
                    {season && episode ? (
                      <p className="text-xs text-cyan-400 mt-0.5 font-medium">Season {season} • Episode {episode}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">{media.media_type || 'Movie'}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-300">
                      <span className="text-sm">{localAvatar}</span>
                      <span className="text-[11px] text-slate-400">Hosting as Party Leader</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs text-slate-300 flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span>Start a real-time Watch Party room and invite friends to watch along!</span>
                </div>
              )}

              {/* Toggle for 'Only I have control' */}
              <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/10 flex items-center justify-between shadow-sm">
                <div className="pr-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Only I have control</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Only you can pause, play, seek, and change episodes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={setupOnlyHostControls}
                    onChange={(e) => setSetupOnlyHostControls(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 shadow-inner"></div>
                </label>
              </div>

              {/* Input for 'Display Name' */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Display Name</span>
                  </label>
                  <span className="text-[10px] text-slate-500">No account required</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-white/15 hover:border-cyan-400 transition-all shrink-0 shadow-sm"
                    style={{ backgroundColor: `${localColor}25` }}
                    title="Change Party Avatar"
                  >
                    {localAvatar}
                  </button>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      saveDisplayName(e.target.value);
                    }}
                    placeholder="Enter your name (e.g. Alex)" 
                    maxLength={24}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>

                {/* Inline Avatar Picker */}
                {showAvatarPicker && (
                  <div className="p-3 bg-slate-900 border border-cyan-500/30 rounded-2xl space-y-2 animate-in fade-in zoom-in duration-200 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">Choose Avatar</span>
                      <button 
                        type="button" 
                        onClick={() => setShowAvatarPicker(false)}
                        className="text-[10px] text-cyan-400 font-bold hover:underline"
                      >
                        Done
                      </button>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5">
                      {PARTY_AVATARS.map(av => (
                        <button
                          key={av.name}
                          type="button"
                          onClick={() => {
                            onSetAvatar?.(av.emoji);
                            localStorage.setItem('mondoflix_party_avatar', av.emoji);
                            setShowAvatarPicker(false);
                          }}
                          className={`text-lg p-1 rounded-lg transition-transform hover:scale-125 ${localAvatar === av.emoji ? 'bg-cyan-500/30 ring-1 ring-cyan-400' : 'hover:bg-white/10'}`}
                          title={av.name}
                        >
                          {av.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Start Watch Party Button */}
              <button
                type="button"
                onClick={handleStartWatchParty}
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isLoading ? 'Starting Room...' : 'Start Watch Party'}</span>
              </button>

              {/* Feature highlights */}
              <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Sub-second real-time playback synchronization</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Supports up to 10 viewers simultaneously</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Integrated live chat and floating emoji reactions</span>
                </div>
              </div>
            </div>
          ) : setupTab === 'recent' ? (
            <div className="space-y-4">
              <RecentPartiesSection onSelectSession={(session) => {
                if (onPartyCreated) {
                  onPartyCreated(session.code);
                } else {
                  sessionStorage.setItem('active_party_code', session.code);
                  let targetUrl = `/watch/${session.mediaType}/${session.mediaId}`;
                  if (session.mediaType === 'tv' && session.season && session.episode) {
                    targetUrl += `/season/${session.season}/episode/${session.episode}`;
                  }
                  targetUrl += `?party=${session.code}`;
                  navigate(targetUrl);
                }
              }} />
            </div>
          ) : (
            /* Join with code form */
            <div className="space-y-5">
              <form onSubmit={handleJoinWatchParty} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Enter Party Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-2xl font-mono text-center tracking-widest text-cyan-400 focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-white/20"
                    placeholder="CODE"
                    maxLength={8}
                    required
                  />
                  <p className="text-[11px] text-slate-400 text-center">
                    Enter the 6-character room code shared by your friend
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Display Name</span>
                  </label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      saveDisplayName(e.target.value);
                    }}
                    placeholder="Enter your name (e.g. Sam)" 
                    maxLength={24}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || joinCode.length < 4}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Connecting...' : 'Join Watch Party'}</span>
                </button>
              </form>

              {recentParties.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Or resume recent session:</span>
                    <button
                      type="button"
                      onClick={() => setSetupTab('recent')}
                      className="text-cyan-400 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      View all ({recentParties.length}) →
                    </button>
                  </div>
                  <RecentPartiesSection 
                    limit={2} 
                    compact 
                    onSelectSession={(session) => {
                      if (onPartyCreated) {
                        onPartyCreated(session.code);
                      } else {
                        sessionStorage.setItem('active_party_code', session.code);
                        let targetUrl = `/watch/${session.mediaType}/${session.mediaId}`;
                        if (session.mediaType === 'tv' && session.season && session.episode) {
                          targetUrl += `/season/${session.season}/episode/${session.episode}`;
                        }
                        targetUrl += `?party=${session.code}`;
                        navigate(targetUrl);
                      }
                    }} 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: ACTIVE REALTIME WATCH PARTY MODE
  // ==========================================
  return (
    <div className="flex flex-col h-full bg-[#070E1B] border-l border-white/10 w-full shadow-2xl relative select-none">
      {/* Active Room Top Header */}
      <div className="p-3.5 border-b border-white/10 bg-slate-950/70 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white tracking-tight truncate">Watch Party</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[150px]">{activeTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={toggleSound} 
            className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
            title={soundEnabled ? "Mute party sounds" : "Unmute party sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          
          <button 
            onClick={isHost ? (onEndParty || onLeave) : onLeave}
            className="text-xs font-bold text-rose-300 hover:text-white px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-600/40 rounded-lg border border-rose-500/30 transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.15)] cursor-pointer"
            title={isHost ? "End Watch Party session for everyone" : "Exit Watch Party session"}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>{isHost ? 'End' : 'Exit'}</span>
          </button>
        </div>
      </div>

      {/* Share / Invite Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/60 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium">Room:</span>
          <button 
            onClick={copyPartyCode}
            className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors group text-xs font-mono font-bold text-cyan-400 cursor-pointer"
            title="Click to copy party code"
          >
            <span>{activeCode}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400 group-hover:text-white" />}
          </button>
        </div>

        <button
          onClick={sharePartyLink}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-medium transition-all cursor-pointer"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
          <span>{copiedLink ? 'Link Copied!' : 'Invite Friends'}</span>
        </button>
      </div>

      {/* Active Control Request Banner for Host */}
      {isHost && controlRequests && controlRequests.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-cyan-950/90 to-indigo-950/90 border-b border-cyan-500/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{controlRequests[0].requesterAvatar || '🙋'}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  <span className="text-cyan-400">{controlRequests[0].requesterName}</span> requested control
                </p>
                <p className="text-[10px] text-slate-400">Unlock player controls?</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onGrantControl?.(controlRequests[0].requesterId)}
                className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-[11px] rounded-lg shadow transition-all cursor-pointer flex items-center gap-1"
                title="Grant control"
              >
                <Check className="w-3 h-3" /> Grant
              </button>
              <button
                onClick={() => onDeclineControl?.(controlRequests[0].requesterId)}
                className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                title="Decline"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Request Feedback Toast for Member */}
      {controlFeedback && (
        <div className="px-3.5 py-2 bg-cyan-950/90 border-b border-cyan-500/30 flex items-center justify-between text-xs text-cyan-200 animate-in fade-in">
          <span className="truncate">{controlFeedback}</span>
          {onDismissFeedback && (
            <button onClick={onDismissFeedback} className="text-cyan-400 hover:text-white p-0.5 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Playback Control Mode & Sync Indicator */}
      <div className="px-3.5 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {hostPaused ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium shrink-0">
              <Pause className="w-3.5 h-3.5" /> Host Paused
            </span>
          ) : driftSeconds > 5 ? (
            <span className="flex items-center gap-1.5 text-rose-400 font-medium shrink-0">
              <AlertCircle className="w-3.5 h-3.5" /> Behind {Math.round(driftSeconds)}s
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              In Sync
            </span>
          )}

          <span className="text-slate-600">•</span>

          <span className="text-slate-400 flex items-center gap-1 text-[11px] truncate">
            <Shield className="w-3 h-3 text-slate-500 shrink-0" />
            {onlyHostControls ? 'Host Only' : 'Shared Controls'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onlyHostControls && !isHost && onRequestControl && (
            <button
              onClick={onRequestControl}
              disabled={isControlRequestPending}
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer",
                isControlRequestPending
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 opacity-80 cursor-wait"
                  : "bg-cyan-500/30 hover:bg-cyan-500/50 text-cyan-200 hover:text-white border-cyan-400/60 shadow-cyan-500/20 active:scale-95"
              )}
              title="Request control of playback from host"
            >
              {isControlRequestPending ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                  <span>Pending...</span>
                </>
              ) : (
                <>
                  <Gamepad2 className="w-2.5 h-2.5 text-cyan-400" />
                  <span>Request Control</span>
                </>
              )}
            </button>
          )}

          {driftSeconds > 5 && onResync && (
            <button 
              onClick={onResync}
              className="text-[11px] font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded border border-cyan-500/30 transition-colors cursor-pointer"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>

      {/* Realtime Tabs */}
      <div className="flex border-b border-white/10 bg-slate-950/40 text-xs font-semibold">
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${activeTab === 'chat' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
        <button 
          onClick={() => setActiveTab('members')} 
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${activeTab === 'members' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members ({members.length}/10)</span>
        </button>
        <button 
          onClick={() => setActiveTab('recent')} 
          className={`py-2 px-2.5 flex items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === 'recent' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
          title="Recently Viewed Sessions"
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Recent</span>
        </button>
        {isHost && (
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`py-2 px-3 flex items-center justify-center transition-colors cursor-pointer ${activeTab === 'settings' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
            title="Party Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <>
            {/* Host Controls Banner / Request Control Action in Chat */}
            {onlyHostControls && !isHost && (
              <div className="mx-3 mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs shrink-0 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-amber-400 text-sm shrink-0">🔒</span>
                  <div className="min-w-0">
                    <p className="font-bold text-amber-200 text-[11px] truncate">Host Controls Playback</p>
                    <p className="text-slate-400 text-[10px] truncate">Screen is synced with host</p>
                  </div>
                </div>
                {onRequestControl && (
                  <button
                    onClick={onRequestControl}
                    disabled={isControlRequestPending}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-all flex items-center gap-1 border shadow-sm",
                      isControlRequestPending
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 cursor-wait opacity-80"
                        : "bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 active:scale-95 cursor-pointer"
                    )}
                    title="Ask the host for permission to play, pause, and seek"
                  >
                    {isControlRequestPending ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Pending...</span>
                      </>
                    ) : (
                      <>
                        <Gamepad2 className="w-3 h-3" />
                        <span>Request Control</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Host: Incoming Control Requests notification banner */}
            {isHost && controlRequests && controlRequests.length > 0 && (
              <div className="mx-3 mt-2.5 p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-between gap-2 shrink-0 shadow-lg animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{controlRequests[0].requesterAvatar || '🙋'}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-[11px] truncate">
                      <span className="text-cyan-300">{controlRequests[0].requesterName}</span> requested control
                    </p>
                    <p className="text-slate-400 text-[10px]">Unlock player controls for viewer?</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onGrantControl?.(controlRequests[0].requesterId)}
                    className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow"
                    title="Grant player control"
                  >
                    <Check className="w-3 h-3" /> Grant
                  </button>
                  <button
                    onClick={() => onDeclineControl?.(controlRequests[0].requesterId)}
                    className="p-1 bg-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg text-xs cursor-pointer"
                    title="Decline request"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Shared Controls Notification Banner (when controls are open to everyone) */}
            {!onlyHostControls && (
              <div className="mx-3 mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-300 text-[11px] truncate">Shared Player Controls Active</span>
                </div>
                {isHost && onUpdateSettings && (
                  <button
                    onClick={() => onUpdateSettings({ only_host_controls: true })}
                    className="text-[10px] text-slate-400 hover:text-amber-300 underline font-semibold shrink-0 cursor-pointer"
                    title="Restore Host Only controls"
                  >
                    Lock to Host
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar text-sm">
              {visibleMessages.length === 0 && (
                <div className="text-center py-8 px-4 text-slate-500 text-xs">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-cyan-400/50" />
                  <p className="font-semibold text-slate-300">Welcome to the Watch Party!</p>
                  <p className="mt-1 text-slate-400">Video playback and chat are synced in real time with everyone in the room.</p>
                </div>
              )}

              {visibleMessages.map((m, i) => (
                <div key={`${m.id}-${i}`}>
                  {m.kind === 'system' ? (
                    <div className="flex justify-center my-2">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-white/5 inline-flex items-center gap-1 text-center">
                        {m.body}
                      </span>
                    </div>
                  ) : m.kind === 'reaction' ? (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-base">{m.user_avatar || '🍿'}</span>
                      <span className="font-semibold text-xs text-slate-300">{m.user_name}:</span>
                      <span className="text-xl animate-bounce">{m.body}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm shrink-0"
                        style={{ backgroundColor: m.user_color ? `${m.user_color}25` : 'rgba(6,182,212,0.15)', borderColor: m.user_color || '#06b6d4', borderWidth: 1 }}
                      >
                        {m.user_avatar || '🍿'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span 
                            className="font-bold text-xs truncate"
                            style={{ color: m.user_color || '#38bdf8' }}
                          >
                            {m.user_name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs mt-0.5 break-words select-text">
                          {m.body}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                  </div>
                  <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Reaction Bar */}
            <div className="px-3 py-1.5 bg-slate-950/80 border-t border-white/5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onSendReaction?.(emoji)}
                  className="hover:scale-125 active:scale-95 transition-all text-xl p-1 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
                  title={`Send ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <div className="p-3 bg-slate-950 border-t border-white/10 relative">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base hover:scale-105 transition-transform shrink-0 border border-white/20 cursor-pointer"
                  style={{ backgroundColor: `${localColor}25` }}
                  title="Change your avatar"
                >
                  {localAvatar}
                </button>

                <input
                  type="text"
                  value={msgInput}
                  onChange={handleInputChange}
                  placeholder="Chat with the party..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-cyan-400 text-white placeholder-slate-500 transition-colors"
                  maxLength={400}
                />
                
                <button 
                  type="submit"
                  disabled={!msgInput.trim()}
                  className="p-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white rounded-full transition-all shrink-0 shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Avatar Picker Popover */}
              {showAvatarPicker && (
                <div className="absolute bottom-16 left-3 right-3 bg-slate-900 border border-white/20 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200">Choose Avatar</span>
                    <button 
                      onClick={() => setShowAvatarPicker(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Done
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-2 mb-3">
                    {PARTY_AVATARS.map(av => (
                      <button
                        key={av.name}
                        onClick={() => {
                          onSetAvatar?.(av.emoji);
                          localStorage.setItem('mondoflix_party_avatar', av.emoji);
                        }}
                        className={`text-xl p-1 rounded-lg hover:scale-125 transition-transform ${localAvatar === av.emoji ? 'bg-cyan-500/30 ring-2 ring-cyan-400' : 'hover:bg-white/10'}`}
                      >
                        {av.emoji}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Color</span>
                    <div className="flex gap-2 justify-between">
                      {PARTY_COLORS.map(c => (
                        <button
                          key={c.name}
                          onClick={() => {
                            onSetColor?.(c.hex);
                            localStorage.setItem('mondoflix_party_color', c.hex);
                          }}
                          className={`w-6 h-6 rounded-full transition-transform hover:scale-115 ${localColor === c.hex ? 'ring-2 ring-white scale-110' : ''}`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2 custom-scrollbar">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span>Participants ({members.length}/10)</span>
              <span className="text-[10px] text-slate-500 font-normal normal-case">Live Sync Telemetry</span>
            </div>

            {members.map(m => {
              const isBuffering = m.status === 'buffering';
              const isDesynced = m.status === 'desynced';
              const isPaused = m.status === 'paused';

              return (
                <div 
                  key={m.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center text-lg border shadow-sm"
                        style={{ backgroundColor: m.color ? `${m.color}20` : 'rgba(6,182,212,0.2)', borderColor: m.color || '#06b6d4' }}
                      >
                        {m.avatar || '🍿'}
                      </div>
                      
                      {/* Telemetry Status Dot */}
                      <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center">
                        {!m.online ? (
                          <div className="w-3 h-3 rounded-full border-2 border-[#070E1B] bg-slate-500" title="Offline" />
                        ) : isBuffering ? (
                          <div className="relative flex items-center justify-center w-3.5 h-3.5" title="Buffering">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex rounded-full h-3 w-3 border-2 border-[#070E1B] bg-amber-400" />
                          </div>
                        ) : isDesynced ? (
                          <div className="relative flex items-center justify-center w-3.5 h-3.5" title="Desynced">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
                            <span className="relative inline-flex rounded-full h-3 w-3 border-2 border-[#070E1B] bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                          </div>
                        ) : isPaused ? (
                          <div className="w-3 h-3 rounded-full border-2 border-[#070E1B] bg-cyan-400" title="Paused" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border-2 border-[#070E1B] bg-emerald-400 shadow-[0_0_8px_#34d399]" title="In Sync" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <span className="truncate">{m.name}</span>
                        {m.is_host && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold shrink-0">
                            <Crown className="w-2.5 h-2.5" /> Host
                          </span>
                        )}
                        {mutedUsers.includes(String(m.user_id ?? m.id)) && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-white/5">
                            Muted
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        {!m.online ? (
                          <span className="text-slate-500">Away</span>
                        ) : isBuffering ? (
                          <span className="text-amber-400 font-medium">Buffering video...</span>
                        ) : isDesynced ? (
                          <span className="text-rose-400 font-medium">
                            {m.drift_seconds ? `${Math.round(m.drift_seconds)}s behind` : 'Syncing...'}
                          </span>
                        ) : isPaused ? (
                          <span className="text-cyan-400 font-medium">Paused</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">Watching • In Sync</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => {
                        setTargetFriendId(String(m.user_id ?? m.id));
                        setDmModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      title={`Message ${m.name}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleAddFriend(m.user_id ?? m.id, m.name)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      title={`Add ${m.name} as friend`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => toggleMute(m.user_id ?? m.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        mutedUsers.includes(String(m.user_id ?? m.id))
                          ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                      title={mutedUsers.includes(String(m.user_id ?? m.id)) ? "Unmute in chat" : "Mute in chat"}
                    >
                      {mutedUsers.includes(String(m.user_id ?? m.id)) ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    {isHost && !m.is_host && (
                      <button
                        onClick={() => {
                          if (confirm(`Pass host privileges to ${m.name}? They will gain full control of playback and party settings.`)) {
                            onTransferHost?.(m.user_id ?? m.id);
                          }
                        }}
                        className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
                        title={`Pass Host Control to ${m.name}`}
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    )}

                    {isHost && !m.is_host && (
                      <div>
                        {kickConfirmId === (m.user_id ?? m.id) ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onKickMember?.(m.user_id ?? m.id);
                                setKickConfirmId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Kick
                            </button>
                            <button
                              onClick={() => setKickConfirmId(null)}
                              className="p-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setKickConfirmId(m.user_id ?? m.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Remove viewer from party"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RECENTLY VIEWED SESSIONS TAB */}
        {activeTab === 'recent' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            <RecentPartiesSection onSelectSession={(session) => {
              sessionStorage.setItem('active_party_code', session.code);
              let targetUrl = `/watch/${session.mediaType}/${session.mediaId}`;
              if (session.mediaType === 'tv' && session.season && session.episode) {
                targetUrl += `/season/${session.season}/episode/${session.episode}`;
              }
              targetUrl += `?party=${session.code}`;
              window.location.href = targetUrl;
            }} />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            {isHost ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="pr-3">
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-cyan-400" /> Only I have control
                      </h4>
                      <p className="text-slate-400 text-xs mt-0.5">
                        When enabled, only the host can play, pause, seek, and change episodes.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={onlyHostControls}
                        onChange={(e) => onUpdateSettings?.({ only_host_controls: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                </div>

                {controlRequests && controlRequests.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2.5">
                    <h4 className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-cyan-400" /> Pending Control Requests ({controlRequests.length})
                    </h4>
                    <p className="text-slate-400 text-xs">
                      The following viewers requested permission to control the player:
                    </p>
                    <div className="space-y-2 mt-2">
                      {controlRequests.map((req) => (
                        <div key={req.requesterId} className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{req.requesterAvatar || '🙋'}</span>
                            <span className="font-bold text-white text-xs truncate">{req.requesterName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onGrantControl?.(req.requesterId)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Grant
                            </button>
                            <button
                              onClick={() => onDeclineControl?.(req.requesterId)}
                              className="px-2 py-1 bg-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg text-[11px] transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transfer / Pass Host Control Section */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-amber-200 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400" /> Pass Host Privileges
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Host Action
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs">
                    Transfer room leadership and playback control to another participant seamlessly.
                  </p>

                  {members.filter(m => !m.is_host).length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No other participants currently in room to pass host to.</p>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {members.filter(m => !m.is_host).map(otherMember => (
                        <div key={otherMember.id} className="p-2 bg-black/40 rounded-xl border border-amber-500/20 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{otherMember.avatar || '🍿'}</span>
                            <span className="text-xs font-bold text-white truncate">{otherMember.name}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to pass Host privileges to ${otherMember.name}?`)) {
                                onTransferHost?.(otherMember.user_id ?? otherMember.id);
                              }
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Crown className="w-3 h-3 text-black" />
                            <span>Pass Host</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" /> Player Control
                  </h4>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    onlyHostControls 
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30" 
                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  )}>
                    {onlyHostControls ? 'Host Controls Screen' : 'Shared Controls'}
                  </span>
                </div>
                <p className="text-slate-400 text-xs">
                  {onlyHostControls 
                    ? "Currently, only the party host can play, pause, seek, and change episodes. You can request control from the host."
                    : "Shared controls are unlocked! You can play, pause, seek, and change episodes."
                  }
                </p>
                {onlyHostControls && onRequestControl && (
                  <button
                    onClick={onRequestControl}
                    disabled={isControlRequestPending}
                    className={cn(
                      "w-full mt-2 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer",
                      isControlRequestPending
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 opacity-80 cursor-wait"
                        : "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-transparent shadow-lg shadow-cyan-500/25 active:scale-98"
                    )}
                  >
                    {isControlRequestPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Request Pending Host Approval...</span>
                      </>
                    ) : (
                      <>
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>Request Control of Player</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Room Link Box */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-cyan-400" /> Private Room Link
              </h4>
              <p className="text-slate-400">
                This room is unlisted. Only people with your code or link can join.
              </p>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={activeCode} 
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono font-bold text-cyan-400 text-center text-sm"
                />
                <button
                  onClick={copyPartyCode}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={sharePartyLink}
                  className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-slate-950 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Share link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Capacity info */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Real-time Capacity
              </h4>
              <p className="text-slate-400 text-xs">
                Supports up to <strong className="text-white">10 simultaneous viewers</strong> per room with instant real-time synchronization.
              </p>
            </div>

            {/* Exit Party */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <h4 className="font-bold text-sm text-rose-300 flex items-center gap-1.5">
                <LogOut className="w-4 h-4 text-rose-400" /> Exit Watch Party
              </h4>
              <p className="text-slate-400 text-xs">
                {isHost 
                  ? "Ending the watch party will close the session for everyone and return to normal watching."
                  : "Exiting the watch party will leave the room and return to normal watching."
                }
              </p>
              <button
                onClick={isHost ? (onEndParty || onLeave) : onLeave}
                className="w-full mt-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isHost ? 'End Watch Party for Everyone' : 'Exit Watch Party'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {friendNotice && (
        <div className="absolute bottom-4 left-4 right-4 z-50 p-2.5 bg-cyan-950 border border-cyan-500/50 text-cyan-200 text-xs font-bold rounded-xl text-center shadow-2xl animate-in fade-in">
          {friendNotice}
        </div>
      )}

      <DirectMessageModal 
        isOpen={dmModalOpen} 
        onClose={() => { setDmModalOpen(false); setTargetFriendId(null); }} 
        initialFriendId={targetFriendId} 
      />
    </div>
  );
}
