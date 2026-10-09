import React, { useRef, useState } from 'react';
import { ArrowLeft, Check, Plus, Settings, LogOut, User, Share2, Users, Copy, RefreshCw, Pause, Play, MessageSquare, Gamepad2, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-3 md:px-6 transition-all duration-300 gap-2 select-none",
        "bg-gradient-to-b from-[#050A14]/95 via-[#050A14]/85 to-transparent backdrop-blur-xl border-b border-white/5",
        isIdle ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0 pointer-events-auto"
      )}
    >
      {/* Left: Back button & Logo */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 cursor-pointer shadow-sm shrink-0"
          title="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-slate-200" />
        </motion.button>
        <Link 
          to="/" 
          className="cursor-pointer flex items-center group" 
          title="MondoFlix - Go to Home Page"
        >
          <Logo className="h-6 sm:h-7" />
        </Link>
      </div>

      {/* Center: Title or WatchParty Session HUD */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
        {partyCode ? (
          /* Persistent WatchParty Session HUD Overlay */
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 sm:gap-2 bg-[#060D1A]/90 border border-cyan-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-[0_0_25px_rgba(0,245,255,0.18)] max-w-full backdrop-blur-md"
          >
            {/* Live Indicator & Party Code */}
            <div className="flex items-center gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r border-white/10">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              </span>
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider hidden md:inline">Party</span>
              <span className="font-mono font-bold text-white text-[11px] sm:text-xs tracking-wider">{partyCode}</span>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  navigator.clipboard.writeText(partyCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="p-1 hover:bg-white/10 text-cyan-300 rounded-md transition-colors cursor-pointer"
                title="Copy Party Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </motion.button>
            </div>

            {/* Member Count */}
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-200 px-1 sm:px-2 border-r border-white/10" title="Connected Party Members">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>{membersCount}</span>
            </div>

            {/* Duration Display */}
            {durationSeconds && durationSeconds > 0 && (
              <div className="hidden md:flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-300 border-r border-white/10 mr-0.5">
                <span>{formatDuration(durationSeconds)}</span>
              </div>
            )}

            {/* Real-time Playback Synchronization Status */}
            <div className="flex items-center gap-1 sm:gap-2">
              {hostPaused ? (
                (isHost || !onlyHostControls) && onTogglePause ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onTogglePause}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-extrabold rounded-full text-[10px] sm:text-xs shadow-[0_0_15px_rgba(52,211,153,0.4)] cursor-pointer"
                    title="Click to resume playback for everyone"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Resume Party</span>
                  </motion.button>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-semibold text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" /> <span className="hidden sm:inline">Host Paused</span>
                  </span>
                )
              ) : driftSeconds > 3 ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onResync}
                  className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-full text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer"
                  title="Click to resync with host"
                >
                  <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin text-rose-400" />
                  <span>Sync ({Math.round(driftSeconds)}s)</span>
                </motion.button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    <span className="hidden sm:inline">In Sync</span>
                  </span>
                  {(isHost || !onlyHostControls) && onTogglePause && (
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onTogglePause}
                      className="p-1 hover:bg-white/10 text-slate-400 hover:text-amber-300 rounded-full transition-colors cursor-pointer"
                      title="Pause watch party for everyone"
                    >
                      <Pause className="w-3 h-3" />
                    </motion.button>
                  )}
                </div>
              )}
            </div>

            {/* Host Controls Lock Badge & Request Control Button */}
            {onlyHostControls && !isHost && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 hidden sm:inline">
                  Host Controls
                </span>
                {onRequestControl && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRequestControl}
                    disabled={isControlRequestPending}
                    className={cn(
                      "px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 border cursor-pointer",
                      isControlRequestPending
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 cursor-wait opacity-80"
                        : "bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-[0_0_12px_rgba(0,245,255,0.3)]"
                    )}
                    title="Request player control from host"
                  >
                    {isControlRequestPending ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                        <span className="hidden sm:inline">Pending...</span>
                      </>
                    ) : (
                      <>
                        <Gamepad2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" />
                        <span>Control</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            )}

            {/* Toggle Chat Sidebar Button */}
            {onToggleSidebar && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleSidebar}
                className={cn(
                  "ml-0.5 sm:ml-1 px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 text-[11px] sm:text-xs font-semibold cursor-pointer",
                  showSidebar 
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,245,255,0.25)]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                )}
                title={showSidebar ? "Hide Watch Party Sidebar" : "Open Watch Party Sidebar"}
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden lg:inline">{showSidebar ? 'Hide' : 'Chat'}</span>
              </motion.button>
            )}

            {/* Friends Direct Message Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDmOpen(true)}
              className="ml-0.5 sm:ml-1 p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 text-[11px] sm:text-xs font-semibold cursor-pointer"
              title="Friends & Direct Messages"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Friends</span>
            </motion.button>

            {/* End Party (Host) or Exit Party (Member) Button */}
            {isHost ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEndParty || onExitParty}
                className="ml-0.5 sm:ml-1 px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white border border-red-500/60 transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.35)] cursor-pointer"
                title="End Watch Party for everyone"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span>End</span>
              </motion.button>
            ) : onExitParty ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onExitParty}
                className="ml-0.5 sm:ml-1 px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-1 text-[11px] sm:text-xs font-semibold cursor-pointer"
                title="Exit Watch Party Session"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Exit</span>
              </motion.button>
            ) : null}
          </motion.div>
        ) : (
          /* Normal Media Title Header (Unboxed Clean Typography) */
          <div className="flex flex-col items-center justify-center truncate max-w-full">
            <h1 className="text-white font-bold text-xs sm:text-sm md:text-base truncate w-full text-center tracking-tight">
              {title}
            </h1>
            {season && episode && (
              <span className="text-[11px] font-medium text-slate-400 truncate w-full text-center">
                Season {season} · Episode {episode} {episodeName ? `· ${episodeName}` : ''}
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

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="w-8 h-8 hidden sm:flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/15 transition-colors text-slate-300 hover:text-white cursor-pointer"
          title="Share link"
        >
          <Share2 className="w-3.5 h-3.5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleWatchlistClick}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs transition-all border cursor-pointer",
            inList
              ? "bg-white/10 border-white/20 text-white hover:bg-white/15"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:border-cyan-400"
          )}
        >
          {inList ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{inList ? 'Added' : 'Add to List'}</span>
        </motion.button>

        {user ? (
          <div className="relative" ref={profileMenuRef}>
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-full shadow-md flex items-center justify-center font-bold border border-white/20 text-black text-xs cursor-pointer select-none"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {user.username.charAt(0).toUpperCase()}
            </motion.div>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.94, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 8 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="absolute right-0 top-11 w-52 bg-[#0A1428]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                >
                  <div className="px-4 py-2 text-xs font-semibold text-slate-300 border-b border-white/5 mb-1 truncate">
                    {user.email}
                  </div>
                  <button 
                    className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3 cursor-pointer text-xs text-slate-300 hover:text-white transition-colors" 
                    onClick={() => { openSettingsModal(); setShowProfileMenu(false); }}
                  >
                    <Settings className="w-3.5 h-3.5 text-cyan-400" /> Settings
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3 cursor-pointer text-xs text-rose-400 hover:text-rose-300 transition-colors" 
                    onClick={() => { logout(); setShowProfileMenu(false); }}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAuthModal}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/15 transition-colors text-white cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>

      <DirectMessageModal isOpen={dmOpen} onClose={() => setDmOpen(false)} />
    </header>
  );
};
