import React, { useState } from 'react';
import { X, Copy, Check, Users, Play, LogIn, Shield, Sparkles, Share2, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { partyApi } from '../../services/partyApi';
import type { Media } from '../../types';
import { getStoredUserAvatar, getStoredUserColor } from '../../utils/partyAvatars';
import { RecentPartiesSection } from './RecentPartiesSection';
import { saveRecentParty } from '../../utils/recentParties';
import { useRecentParties } from '../../hooks/useRecentParties';

interface WatchPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  media?: Media;
  season?: number;
  episode?: number;
}

export function WatchPartyModal({ isOpen, onClose, media, season, episode }: WatchPartyModalProps) {
  const [tab, setTab] = useState<'create' | 'join' | 'recent'>(media ? 'create' : 'join');
  const { parties: recentParties } = useRecentParties();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlyHostControls, setOnlyHostControls] = useState(true);
  const [userAvatar] = useState(getStoredUserAvatar);
  const [userColor] = useState(getStoredUserColor);
  const [nickname, setNickname] = useState(() => {
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
  const navigate = useNavigate();

  React.useEffect(() => {
    const activeCode = sessionStorage.getItem('active_party_code');
    if (activeCode && !generatedCode) {
      setGeneratedCode(activeCode);
    }
  }, [generatedCode]);

  if (!isOpen) return null;

  const saveNickname = () => {
    if (nickname.trim()) {
      localStorage.setItem('mondoflix_guest_name', nickname.trim());
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    saveNickname();
    try {
      const activeMedia = media || { id: 1101383, title: 'Watch Party Lobby', media_type: 'movie', poster_path: '' };
      let mType = activeMedia.media_type as string;
      
      // Defensively infer the media type if missing from TMDB details object
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

      const res = await partyApi.create({
        media_id: activeMedia.id || 1101383,
        media_type: mType as any,
        season: season || null,
        episode: episode || null,
        title: inferredTitle,
        poster_path: activeMedia.poster_path || null,
        only_host_controls: onlyHostControls
      });

      // Save active code for instant navbar badge and recent history
      sessionStorage.setItem('active_party_code', res.code);
      setGeneratedCode(res.code);

      saveRecentParty({
        code: res.code,
        title: inferredTitle,
        mediaId: activeMedia.id || 1101383,
        mediaType: (mType as 'movie' | 'tv') || 'movie',
        season: season || null,
        episode: episode || null,
        posterPath: activeMedia.poster_path || null,
        isHost: true,
        isActive: true,
        lastJoinedAt: Date.now()
      });

      // Direct Watch Party Mode entry!
      if (media && activeMedia.id) {
        let targetUrl = `/watch/${mType}/${activeMedia.id}`;
        if (mType === 'tv' && season && episode) {
          targetUrl += `/season/${season}/episode/${episode}`;
        }
        targetUrl += `?party=${res.code}`;
        navigate(targetUrl);
      } else {
        // Direct to Home page!
        navigate(`/?party=${res.code}`);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create watch party');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setError('Please enter a valid party code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    saveNickname();
    try {
      const res = await partyApi.get(cleanCode);
      const party = res.party;
      
      sessionStorage.setItem('active_party_code', party.code);

      saveRecentParty({
        code: party.code,
        title: party.title || 'Watch Party',
        mediaId: party.media_id,
        mediaType: (party.media_type as 'movie' | 'tv') || 'movie',
        season: party.season,
        episode: party.episode,
        posterPath: party.poster_path,
        hostName: party.host_name,
        isHost: res.is_host,
        isActive: party.is_active,
        lastJoinedAt: Date.now()
      });

      let url = `/watch/${party.media_type}/${party.media_id}`;
      if (party.media_type === 'tv' && party.season && party.episode) {
        url += `/season/${party.season}/episode/${party.episode}`;
      }
      url += `?party=${party.code}`;
      
      navigate(url);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to find party. Please verify the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (!generatedCode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('party', generatedCode);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!generatedCode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('party', generatedCode);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my Watch Party on Mondoflix!`,
          text: `Watch together in real-time sync with live chat:`,
          url: url.toString()
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Centered backdrop blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Centered Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="relative w-full max-w-md bg-[#0A1428]/95 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,245,255,0.15)] overflow-hidden flex flex-col z-10 my-auto"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                    Watch Party <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Real-Time</span>
                  </h2>
                  <p className="text-xs text-slate-400">Watch together with synchronized video & live chat</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
        
        {/* Tab Toggle with Motion Segmented Pill */}
        <div className="flex border-b border-white/10 bg-slate-950/60 p-1.5 gap-1.5 relative">
          {(['create', 'join', 'recent'] as const).map((tabKey) => {
            const isActive = tab === tabKey;
            const label = tabKey === 'create' ? 'Start Party' : tabKey === 'join' ? 'Join Party' : 'Recent';
            return (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold transition-colors relative flex items-center justify-center gap-1.5 rounded-xl z-10 cursor-pointer",
                  isActive ? "text-cyan-300" : "text-slate-400 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="party-modal-tab-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl -z-10 shadow-sm"
                  />
                )}
                {tabKey === 'recent' && <Clock className="w-3.5 h-3.5" />}
                <span>{label}</span>
                {tabKey === 'recent' && recentParties.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                    {recentParties.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5 max-h-[calc(85vh-120px)] overflow-y-auto custom-scrollbar">
          {(() => {
            const currentPartyCode = new URLSearchParams(window.location.search).get('party');
            if (currentPartyCode && !generatedCode) {
              return (
                <div className="mb-4 p-3.5 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl flex items-center justify-between text-xs text-cyan-300 shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Active Party Room: <strong className="font-mono text-cyan-400 tracking-wider text-sm">{currentPartyCode}</strong></span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentPartyCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-[11px] font-bold border border-cyan-500/30 flex items-center gap-1 transition-all"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {error && (
            <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {tab === 'create' ? (
            <div className="space-y-4">
              {/* Media preview card */}
              {media ? (
                <div className="flex gap-3.5 items-center p-3 bg-white/5 rounded-xl border border-white/10">
                  {media.poster_path ? (
                    <img 
                      src={`https://image.tmdb.org/t/p/w92${media.poster_path}`} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      className="w-12 h-16 object-cover rounded-lg shadow" 
                    />
                  ) : (
                    <div className="w-12 h-16 bg-white/10 rounded-lg flex items-center justify-center text-slate-400">
                      <Users className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-white line-clamp-1">{media.title || media.name}</h3>
                    {season && episode ? (
                      <p className="text-xs text-cyan-400 mt-0.5">Season {season} • Episode {episode}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">{media.media_type || 'Movie'}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-300">
                      <span className="text-base">{userAvatar}</span>
                      <span className="text-[11px] text-slate-400">Hosting as Party Leader</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <span>Start a Watch Party room or join your friends with a party code.</span>
                </div>
              )}

              {!generatedCode ? (
                <>
                  {/* Host Control Preference Option */}
                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" /> Only I have control
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Only you can pause, play, seek, and change episodes
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3">
                      <input 
                        type="checkbox" 
                        checked={onlyHostControls}
                        onChange={(e) => setOnlyHostControls(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {/* Nickname input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-400" /> Your Display Name (optional)
                    </label>
                    <input 
                      type="text" 
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Alex (no account needed)" 
                      maxLength={24}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreate}
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    {isLoading ? 'Creating Room...' : 'Start Watch Party'}
                  </motion.button>
                </>
              ) : (
                <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                  <div className="p-5 bg-gradient-to-b from-cyan-950/40 to-slate-900/80 border border-cyan-500/40 rounded-2xl text-center space-y-2 shadow-xl shadow-cyan-950/50">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Watch Party Room Active
                    </span>
                    <p className="text-xs text-slate-300 font-medium">Your Party Code is ready! Share with friends:</p>
                    
                    {/* Code Display Box with Copy */}
                    <div className="flex items-center justify-center gap-2 p-2 bg-slate-950/80 rounded-xl border border-cyan-500/30 my-2">
                      <span className="text-3xl font-mono font-extrabold tracking-widest text-cyan-400 px-3">{generatedCode}</span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-bold transition-all border border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                        title="Copy Code"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy Code'}</span>
                      </motion.button>
                    </div>

                    <p className="text-[11px] text-slate-400">Direct room link synchronizes video playback & live chat</p>
                  </div>

                  <div className="flex gap-2.5">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={shareLink}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-white/10 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-cyan-400" />}
                      <span>{copiedLink ? 'Link Copied!' : 'Share / Copy Link'}</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (media && media.id) {
                          const mType = (media.media_type === 'tv' || (media as any).first_air_date) ? 'tv' : 'movie';
                          navigate(`/watch/${mType}/${media.id}?party=${generatedCode}`);
                        } else {
                          const url = new URL(window.location.href);
                          url.searchParams.set('party', generatedCode);
                          navigate(url.pathname + url.search);
                        }
                        onClose();
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Enter Watch Room</span>
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          ) : tab === 'recent' ? (
            <div className="space-y-4">
              <RecentPartiesSection onSelectSession={() => onClose()} />
            </div>
          ) : (
            <div className="space-y-5">
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Enter Party Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-mono text-center tracking-widest text-cyan-400 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-white/20"
                    placeholder="CODE"
                    maxLength={8}
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                    Paste the 6 or 8 character code provided by the party host
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Your Display Name (optional)
                  </label>
                  <input 
                    type="text" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Sam (no account needed)" 
                    maxLength={24}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || code.length < 4}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Connecting...' : 'Join Watch Party'}</span>
                </motion.button>
              </form>

              {recentParties.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Or resume a recent session:</span>
                    <button
                      type="button"
                      onClick={() => setTab('recent')}
                      className="text-cyan-400 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      View all ({recentParties.length}) →
                    </button>
                  </div>
                  <RecentPartiesSection limit={2} compact onSelectSession={() => onClose()} />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
    )}
    </AnimatePresence>
  );
}
