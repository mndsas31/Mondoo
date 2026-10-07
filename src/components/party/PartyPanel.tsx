import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Send, Crown, AlertCircle, Copy, Check, Volume2, VolumeX, 
  Settings, Smile, Shield, Sparkles, MessageSquare, Play, Pause, ChevronRight, LogOut,
  UserX, Share2
} from 'lucide-react';
import type { WatchParty, PartyMember, PartyMessage } from '../../types/party';
import { PARTY_AVATARS, PARTY_COLORS, partySounds } from '../../utils/partyAvatars';

interface PartyPanelProps {
  party?: WatchParty | null;
  partyCode?: string | null;
  members: PartyMember[];
  messages: PartyMessage[];
  isHost: boolean;
  driftSeconds: number;
  hostPaused: boolean;
  userAvatar: string;
  userColor: string;
  typingUsers?: string[];
  onlyHostControls?: boolean;
  onLeave: () => void;
  onEndParty?: () => void;
  onSendMessage: (body: string) => void;
  onSendReaction: (emoji: string) => void;
  onSendTyping?: () => void;
  onResync: () => void;
  onKickMember?: (userId: string | number) => void;
  onUpdateSettings?: (settings: { only_host_controls?: boolean }) => void;
  onTransferHost?: (newHostId: string | number) => void;
  onSetAvatar?: (avatar: string) => void;
  onSetColor?: (color: string) => void;
}

const EMOJIS = ['🍿', '🔥', '😂', '😱', '❤️', '👏', '🎉', '🚀'];

export function PartyPanel({ 
  party, 
  partyCode,
  members, 
  messages, 
  isHost, 
  driftSeconds, 
  hostPaused,
  userAvatar,
  userColor,
  typingUsers = [],
  onlyHostControls = true,
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
  onSetColor
}: PartyPanelProps) {
  const activeCode = party?.code || partyCode || 'PARTY';
  const activeTitle = party?.title || 'Watch Party Room';
  const [msgInput, setMsgInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [tab, setTab] = useState<'chat' | 'members' | 'settings'>('chat');
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (msgInput.trim()) {
      onSendMessage(msgInput.trim());
      setMsgInput('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsgInput(e.target.value);
    onSendTyping?.();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePartyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('party', activeCode);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Watch Party: ${activeTitle}`,
          text: `Join my watch party on Mondoflix to watch together in real time:`,
          url: url.toString()
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const toggleSound = () => {
    const next = partySounds.toggle();
    setSoundEnabled(next);
  };

  const visibleMessages = messages.filter(m => m.kind === 'system' || !mutedUsers.includes(String(m.user_id)));

  return (
    <div className="flex flex-col h-full bg-[#070E1B] border-l border-white/10 w-full md:w-88 lg:w-96 shadow-2xl relative select-none">
      {/* Watch Party Header */}
      <div className="p-3.5 border-b border-white/10 bg-slate-950/70 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white tracking-tight">Watch Party</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[140px]">{activeTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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
            <span>{isHost ? 'End Party' : 'Exit Party'}</span>
          </button>
        </div>
      </div>

      {/* Share / Invite Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/60 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium">Room:</span>
          <button 
            onClick={copyCode}
            className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors group text-xs font-mono font-bold text-cyan-400"
            title="Click to copy party code"
          >
            <span>{activeCode}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400 group-hover:text-white" />}
          </button>
        </div>

        <button
          onClick={sharePartyLink}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded-md text-xs font-medium transition-all"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
          <span>{copiedLink ? 'Link Copied!' : 'Invite Friends'}</span>
        </button>
      </div>

      {/* Playback Control Mode & Sync Indicator */}
      <div className="px-3.5 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {hostPaused ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Pause className="w-3.5 h-3.5" /> Host Paused
            </span>
          ) : driftSeconds > 5 ? (
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Behind {Math.round(driftSeconds)}s
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              In Sync
            </span>
          )}

          <span className="text-slate-600">•</span>

          <span className="text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-500" />
            {onlyHostControls ? 'Host Only' : 'Shared Controls'}
          </span>
        </div>

        {driftSeconds > 5 && (
          <button 
            onClick={onResync}
            className="text-[11px] font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded border border-cyan-500/30 transition-colors"
          >
            Sync Now
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-slate-950/40 text-xs font-semibold">
        <button 
          onClick={() => setTab('chat')} 
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${tab === 'chat' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
        <button 
          onClick={() => setTab('members')} 
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${tab === 'members' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members ({members.length}/10)</span>
        </button>
        {isHost && (
          <button 
            onClick={() => setTab('settings')} 
            className={`py-2 px-3 flex items-center justify-center transition-colors ${tab === 'settings' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-slate-400 hover:text-white'}`}
            title="Party Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {tab === 'chat' && (
          <>
            {/* Chat message list */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar text-sm">
              {visibleMessages.length === 0 && (
                <div className="text-center py-10 px-4 text-slate-500 text-xs">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-cyan-400/50" />
                  <p className="font-semibold text-slate-400">Welcome to the Watch Party!</p>
                  <p className="mt-1">Messages and video playback are synced with everyone in the room in real time.</p>
                </div>
              )}

              {visibleMessages.map((m, i) => (
                <div key={`${m.id}-${i}`}>
                  {m.kind === 'system' ? (
                    <div className="flex justify-center my-2">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-white/5 inline-flex items-center gap-1">
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
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm flex-shrink-0"
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
                  onClick={() => onSendReaction(emoji)}
                  className="hover:scale-135 active:scale-95 transition-all text-xl p-1 rounded-lg hover:bg-white/10 flex-shrink-0"
                  title={`Send ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input form */}
            <div className="p-3 bg-slate-950 border-t border-white/10 relative">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                {/* User avatar button to change */}
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base hover:scale-105 transition-transform flex-shrink-0 border border-white/20"
                  style={{ backgroundColor: `${userColor}20` }}
                  title="Change your avatar"
                >
                  {userAvatar}
                </button>

                <input
                  type="text"
                  value={msgInput}
                  onChange={handleInputChange}
                  placeholder="Chat with the party..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-cyan-500 text-white placeholder-slate-500 transition-colors"
                  maxLength={400}
                />
                
                <button 
                  type="submit"
                  disabled={!msgInput.trim()}
                  className="p-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white rounded-full transition-all flex-shrink-0 shadow-md shadow-cyan-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Avatar Picker Popover */}
              {showAvatarPicker && (
                <div className="absolute bottom-16 left-3 right-3 bg-slate-900 border border-white/20 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
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
                        }}
                        className={`text-xl p-1 rounded-lg hover:scale-125 transition-transform ${userAvatar === av.emoji ? 'bg-cyan-500/30 ring-2 ring-cyan-400' : 'hover:bg-white/10'}`}
                      >
                        {av.emoji}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Your Color</span>
                    <div className="flex gap-2 justify-between">
                      {PARTY_COLORS.map(c => (
                        <button
                          key={c.name}
                          onClick={() => onSetColor?.(c.hex)}
                          className={`w-6 h-6 rounded-full transition-transform hover:scale-115 ${userColor === c.hex ? 'ring-2 ring-white scale-110' : ''}`}
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

        {tab === 'members' && (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2 custom-scrollbar">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span>Participants ({members.length})</span>
              <span className="text-[10px] text-slate-500 font-normal normal-case">Live Sync Telemetry</span>
            </div>
            {members.map(m => {
              const isBuffering = m.status === 'buffering';
              const isDesynced = m.status === 'desynced';
              const isPaused = m.status === 'paused';
              const isSynced = m.status === 'synced' || (!m.status && m.online);

              return (
                <div 
                  key={m.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center text-lg border shadow-sm shrink-0"
                        style={{ backgroundColor: m.color ? `${m.color}20` : 'rgba(6,182,212,0.2)', borderColor: m.color || '#06b6d4' }}
                      >
                        {m.avatar || '🍿'}
                      </div>
                      
                      {/* Visual Indicator Status Dot on Avatar */}
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
                          <div className="w-3 h-3 rounded-full border-2 border-[#070E1B] bg-emerald-400 shadow-[0_0_8px_#34d399]" title="Synced with host" />
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
                            {m.drift_seconds ? `${Math.round(m.drift_seconds)}s behind host` : 'Syncing...'}
                          </span>
                        ) : isPaused ? (
                          <span className="text-cyan-400 font-medium">Paused</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">Watching • In Sync</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right side status badge pill & actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {/* Mute user in chat */}
                    <button
                      onClick={() => toggleMute(m.user_id ?? m.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        mutedUsers.includes(String(m.user_id ?? m.id))
                          ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                      title={mutedUsers.includes(String(m.user_id ?? m.id)) ? "Unmute in chat" : "Mute in chat"}
                    >
                      {mutedUsers.includes(String(m.user_id ?? m.id)) ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Host kick option */}
                    {isHost && !m.is_host && (
                      <div>
                        {kickConfirmId === (m.user_id ?? m.id) ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onKickMember?.(m.user_id ?? m.id);
                                setKickConfirmId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                            >
                              Kick
                            </button>
                            <button
                              onClick={() => setKickConfirmId(null)}
                              className="p-1 text-slate-400 hover:text-white text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setKickConfirmId(m.user_id ?? m.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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

        {tab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            {isHost && (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-cyan-400" /> Only I have control
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      When enabled, only the host can play, pause, seek, and change episodes.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
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
            )}

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-cyan-400" /> Private Room Link
              </h4>
              <p className="text-slate-400">
                This room is unlisted and private. Only friends with your link can join.
              </p>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={activeCode} 
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono font-bold text-cyan-400 text-center text-sm"
                />
                <button
                  onClick={copyCode}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-white font-semibold transition-colors flex items-center gap-1"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={sharePartyLink}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-black font-bold transition-colors flex items-center gap-1"
                  title="Share link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Free Plan Limits
              </h4>
              <p className="text-slate-400 text-xs">
                Supports up to <strong className="text-white">10 simultaneous viewers</strong> per room with instant real-time synchronization.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <h4 className="font-bold text-sm text-rose-300 flex items-center gap-1.5">
                <LogOut className="w-4 h-4 text-rose-400" /> Exit Watch Party Mode
              </h4>
              <p className="text-slate-400 text-xs">
                {isHost 
                  ? "Ending the watch party will disconnect all members and return to normal watching mode."
                  : "Exiting the watch party will leave the room and return to normal watching mode."
                }
              </p>
              <button
                onClick={isHost ? (onEndParty || onLeave) : onLeave}
                className="w-full mt-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isHost ? 'End Watch Party for Everyone' : 'Exit Watch Party Mode'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
