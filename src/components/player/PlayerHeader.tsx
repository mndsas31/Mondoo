import React, { useRef, useState } from 'react';
import { ArrowLeft, Check, Plus, Settings, LogOut, User, Share2, Users, Copy, RefreshCw, Pause, Play, MessageSquare, Gamepad2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWatchlist } from '../../context/WatchlistContext';
import { Logo } from '../Logo';
import { Media } from '../../types';
import { cn } from '../../utils/cn';
import { WatchPartyButton } from '../party/WatchPartyButton';
import { DirectMessageModal } from '../DirectMessageModal';

const formatDuration = (secs: number) => {
  if (!secs || isNaN(secs)) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
};

interface PlayerHeaderProps {
  mediaDetails: Media | null;
  season?: number;
  episode?: number;
  episodeName?: string;
  isIdle: boolean;
  partyCode?: string | null;
  membersCount?: number;
  driftSeconds?: number;
  hostPaused?: boolean;
  isHost?: boolean;
  onlyHostControls?: boolean;
  onResync?: () => void;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
  onExitParty?: () => void;
  onEndParty?: () => void;
  onRequestControl?: () => void;
  isControlRequestPending?: boolean;
  onTogglePause?: () => void;
  durationSeconds?: number | null;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({ 
  mediaDetails, 
  season, 
  episode, 
  episodeName, 
  isIdle, 
  partyCode, 
  membersCount = 1, 
  driftSeconds = 0, 
  hostPaused = false, 
  isHost = false, 
  onlyHostControls = true, 
  onResync, 
  showSidebar, 
  onToggleSidebar, 
  onExitParty, 
  onEndParty,
  onRequestControl,
  isControlRequestPending = false,
  onTogglePause,
  durationSeconds
}) => {
  const navigate = useNavigate();
  const { user, logout, openAuthModal, openSettingsModal } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const title = mediaDetails?.title || mediaDetails?.name || '';
  const inList = mediaDetails ? isInWatchlist(mediaDetails.id) : false;

  const handleWatchlistClick = () => {
    if (!mediaDetails) return;
    if (inList) {
      removeFromWatchlist(mediaDetails.id);
    } else {
      addToWatchlist(mediaDetails);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-3 md:px-6 transition-all duration-500 gap-2",
        "bg-gradient-to-b from-[#0A1428]/95 via-[#0A1428]/80 to-transparent backdrop-blur-md border-b border-white/5",
        isIdle ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0 pointer-events-auto"
      )}
    >
      {/* Left: Back & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="hidden sm:block hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/')}>
          <Logo className="h-6" />
        </div>
      </div>

      {/* Center: Title / WatchParty Session HUD */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
        {partyCode ? (
          /* Persistent WatchParty Session HUD Overlay */
          <div className="flex items-center gap-1 sm:gap-2 bg-[#030712]/90 border border-cyan-500/40 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-[0_0_25px_rgba(0,245,255,0.25)] animate-in fade-in duration-300 max-w-full">
            {/* Live Indicator & Party Code */}
            <div className="flex items-center gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r border-white/10">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] uppercase font-black text-cyan-400 tracking-wider hidden md:inline">Party</span>
              <span className="font-mono font-bold text-white text-[11px] sm:text-xs tracking-wider">{partyCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(partyCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="p-1 hover:bg-white/10 text-cyan-300 rounded-md transition-colors"
                title="Copy Party Code"
              >
                {copiedCode ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>
            </div>

            {/* Member Count */}
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-200 px-1 sm:px-2 border-r border-white/10" title="Connected Party Members">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
              <span>{membersCount}</span>
            </div>

            {/* Duration Display */}
            {durationSeconds && durationSeconds > 0 && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[10px] sm:text-[11px] font-bold text-slate-300 border-r border-white/10 mr-1">
                <span>{formatDuration(durationSeconds)}</span>
              </div>
            )}

            {/* Real-time Playback Synchronization Status */}
            <div className="flex items-center gap-1 sm:gap-2">
              {hostPaused ? (
                (isHost || !onlyHostControls) && onTogglePause ? (
                  <button
                    onClick={onTogglePause}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-full text-[10px] sm:text-xs transition-all shadow-[0_0_12px_rgba(52,211,153,0.4)] cursor-pointer animate-pulse"
                    title="Click to resume playback for everyone in the watch party"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Resume Party</span>
                  </button>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" /> <span className="hidden sm:inline">Host Paused</span>
                  </span>
                )
              ) : driftSeconds > 3 ? (
                <button
                  onClick={onResync}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-[10px] sm:text-[11px] font-bold animate-bounce transition-all cursor-pointer"
                  title="Click to resync with host"
                >
                  <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                  <span>Sync ({Math.round(driftSeconds)}s)</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    <span className="hidden sm:inline">In Sync</span>
                  </span>
                  {(isHost || !onlyHostControls) && onTogglePause && (
                    <button
                      onClick={onTogglePause}
                      className="p-1 hover:bg-white/10 text-slate-400 hover:text-amber-300 rounded-full transition-colors cursor-pointer"
                      title="Pause watch party for everyone"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Host Controls Lock Badge & Request Control Button */}
            {onlyHostControls && !isHost && (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold" title="Playback controlled exclusively by Host • Screen is Synced">
                  <span>🔒 <span className="hidden sm:inline">Host Controls</span><span className="sm:hidden">Host</span></span>
                </div>
                {onRequestControl && (
                  <button
                    onClick={onRequestControl}
                    disabled={isControlRequestPending}
                    className={cn(
                      "px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 border cursor-pointer",
                      isControlRequestPending
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 cursor-wait opacity-80"
                        : "bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-[0_0_12px_rgba(0,245,255,0.3)] active:scale-95"
                    )}
                    title="Request control of the video player from the host"
                  >
                    {isControlRequestPending ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                        <span className="hidden sm:inline">Pending...</span>
                      </>
                    ) : (
                      <>
                        <Gamepad2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" />
                        <span>Request Control</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Toggle Chat Sidebar Button */}
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className={cn(
                  "ml-0.5 sm:ml-1 p-1 sm:px-2.5 sm:py-1 rounded-full border transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold cursor-pointer",
                  showSidebar 
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,245,255,0.3)]"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                )}
                title={showSidebar ? "Hide Watch Party Sidebar" : "Open Watch Party Sidebar"}
              >
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
                <span className="hidden lg:inline">{showSidebar ? 'Hide Chat' : 'Chat'}</span>
              </button>
            )}

            {/* Direct Messages & Friends Modal Button */}
            <button
              onClick={() => setDmOpen(true)}
              className="ml-0.5 sm:ml-1 p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold cursor-pointer"
              title="Friends & Direct Messages"
            >
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Friends</span>
            </button>

            {/* End Party (Host) or Exit Party (Member) Button */}
            {isHost ? (
              <button
                onClick={onEndParty || onExitParty}
                className="ml-0.5 sm:ml-1 p-1 sm:px-2.5 sm:py-1 rounded-full bg-red-600 hover:bg-red-500 text-white border border-red-500/60 transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)] cursor-pointer"
                title="End Watch Party for everyone and return to Home"
              >
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                <span>End Party</span>
              </button>
            ) : onExitParty ? (
              <button
                onClick={onExitParty}
                className="ml-0.5 sm:ml-1 p-1 sm:px-2.5 sm:py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 hover:border-rose-500/60 transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold shadow-[0_0_10px_rgba(244,63,94,0.15)] cursor-pointer"
                title="Exit Watch Party Session"
              >
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center truncate max-w-full">
            <h1 className="text-white font-bold text-xs sm:text-sm md:text-base truncate w-full text-center tracking-wide">
              {title}
            </h1>
            {season && episode && (
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-300 truncate w-full text-center">
                S{season} · E{episode} {episodeName ? `· ${episodeName}` : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 justify-end">
        {mediaDetails && !partyCode && (
          <WatchPartyButton 
            media={mediaDetails} 
            season={season} 
            episode={episode} 
            onOpenSidebar={onToggleSidebar}
          />
        )}
        <button
          onClick={handleShare}
          className="w-8 h-8 hidden sm:flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/20 transition-colors text-white"
          title="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleWatchlistClick}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all duration-300 border",
            inList
              ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
              : "bg-gradient-to-r from-[#00F5FF]/10 to-[#8B5CF6]/10 border-[#00F5FF]/30 text-[#00F5FF] hover:border-[#00F5FF]"
          )}
        >
          {inList ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{inList ? 'Added' : 'Add'}</span>
        </button>

        {user ? (
          <div className="relative" ref={profileMenuRef}>
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#00F5FF] to-[#8B5CF6] rounded-full shadow-md flex items-center justify-center font-bold border border-white/20 text-white text-xs">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>

            {showProfileMenu && (
              <div className="absolute right-0 top-11 w-48 bg-[#0A1428]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 text-xs font-bold text-white border-b border-white/5 mb-1 truncate">
                  {user.email}
                </div>
                <div className="px-4 py-2 hover:bg-white/5 flex items-center gap-3 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors" onClick={() => { openSettingsModal(); setShowProfileMenu(false); }}>
                  <Settings className="w-3.5 h-3.5" /> Settings
                </div>
                <div className="px-4 py-2 hover:bg-white/5 flex items-center gap-3 cursor-pointer text-xs text-red-400 hover:text-red-300 transition-colors" onClick={() => { logout(); setShowProfileMenu(false); }}>
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <User className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <DirectMessageModal isOpen={dmOpen} onClose={() => setDmOpen(false)} />
    </header>
  );
};
