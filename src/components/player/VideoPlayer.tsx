import React, { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize, Settings, AlertTriangle, MonitorPlay, RotateCcw, Gamepad2, Loader2, Check, X, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Logo } from '../Logo';
import { parseVidkingMessage } from '../../utils/vidking';

import { ServerButton } from './ServerButton';
import type { MediaSource } from '../../hooks/useSources';
import { SERVERS } from '../../utils/servers';
import { PostMessagePlayerAdapter, PlayerAdapter } from '../../utils/playerAdapter';

interface VideoPlayerProps {
  embedUrl: string;
  activeSource?: MediaSource | null;
  sources?: MediaSource[];
  onSelectSource?: (s: MediaSource) => void;
  onNextServer?: () => void;
  backdropPath?: string | null;
  isIdle: boolean;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  title: string;
  retryCount: number;
  onRetry: () => void;
  onPlayerEvent?: (event: any) => void;
  seekTarget?: number | null;
  onAdapterReady?: (adapter: PlayerAdapter) => void;
  isHost?: boolean;
  onlyHostControls?: boolean;
  partyCode?: string | null;
  hostPaused?: boolean;
  onRequestControl?: () => void;
  isControlRequestPending?: boolean;
  pendingControlRequests?: Array<{ requesterId: string | number; requesterName: string; requesterAvatar?: string; ts: number }>;
  onGrantControl?: (requesterId: string | number) => void;
  onDeclineControl?: (requesterId: string | number) => void;
  controlFeedback?: string | null;
  onDismissFeedback?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  embedUrl,
  activeSource,
  sources,
  onSelectSource,
  onNextServer,
  backdropPath, 
  isIdle,
  onPrevEpisode,
  onNextEpisode,
  title,
  retryCount,
  onRetry,
  onPlayerEvent,
  seekTarget,
  onAdapterReady,
  isHost = false,
  onlyHostControls = true,
  partyCode = null,
  hostPaused = false,
  onRequestControl,
  isControlRequestPending = false,
  pendingControlRequests = [],
  onGrantControl,
  onDeclineControl,
  controlFeedback = null,
  onDismissFeedback
}) => {
  const [loaded, setLoaded] = useState(false);
  const [timeoutState, setTimeoutState] = useState<'none' | 'soft' | 'hard'>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const adapterRef = useRef<PostMessagePlayerAdapter | null>(null);

  const isPlayerOrigin = activeSource?.server_key === 'vidking' || 
                         activeSource?.server_key === 'vidlink' || 
                         activeSource?.server_key === 'vidstuck' ||
                         activeSource?.server_key === 'vidsrc_cc' ||
                         activeSource?.server_key === 'embedsu' ||
                         activeSource?.server_key === 'autoembed';

  // Instantiate and bind PostMessagePlayerAdapter
  useEffect(() => {
    if (!iframeRef.current) return;
    const providerType = activeSource?.server_key === 'youtube' ? 'youtube' : 'custom';
    const adapter = new PostMessagePlayerAdapter(iframeRef.current, { type: providerType });
    adapterRef.current = adapter;
    onAdapterReady?.(adapter);

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, [activeSource?.server_key, onAdapterReady, embedUrl]);

  // Handle external seek requests via postMessage adapter without triggering full page/iframe refresh
  useEffect(() => {
    if (seekTarget !== undefined && seekTarget !== null && adapterRef.current) {
      adapterRef.current.seek(seekTarget);
      if (!hostPaused) {
        adapterRef.current.play();
      }
    }
  }, [seekTarget, hostPaused]);

  // Automated exact timestamp synchronization cadence upon joining an ongoing session
  useEffect(() => {
    if (!partyCode || isHost || seekTarget === null || seekTarget === undefined) return;
    
    // Multi-phase sync attempts to reliably catch embed player across network and iframe init cadences
    const cadences = [100, 400, 900, 1800, 3200, 5000];
    const timers = cadences.map(ms => setTimeout(() => {
      if (adapterRef.current) {
        adapterRef.current.seek(seekTarget);
        if (!hostPaused) {
          adapterRef.current.play();
        } else {
          adapterRef.current.pause();
        }
      }
    }, ms));

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [partyCode, isHost, seekTarget, hostPaused, embedUrl]);

  // Handle host play/pause synchronization via postMessage adapter
  useEffect(() => {
    if (!adapterRef.current || !partyCode) return;
    if (onlyHostControls && !isHost) {
      if (hostPaused) {
        adapterRef.current.pause();
      } else {
        if (seekTarget !== undefined && seekTarget !== null) {
          adapterRef.current.seek(seekTarget);
        }
        adapterRef.current.play();
      }
    }
  }, [hostPaused, isHost, onlyHostControls, partyCode, seekTarget]);

  useEffect(() => {
    setLoaded(false);
    setTimeoutState('none');

    // Auto-reveal safety timer: reveal iframe quickly (500ms) for instant playback
    const autoReveal = setTimeout(() => {
      setLoaded(true);
    }, 500);

    const softTimer = setTimeout(() => {
      setTimeoutState(prev => prev === 'none' ? 'soft' : prev);
    }, 15000);
    
    const hardTimer = setTimeout(() => {
      setTimeoutState(prev => (prev === 'none' || prev === 'soft') ? (retryCount > 0 ? 'hard' : 'soft') : prev);
    }, 30000);

    return () => {
      clearTimeout(autoReveal);
      clearTimeout(softTimer);
      clearTimeout(hardTimer);
    };
  }, [embedUrl, retryCount]);

  useEffect(() => {
     if (loaded) setTimeoutState('none');
  }, [loaded]);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      const origin = e.origin || '';
      const isKnownEmbed = origin.includes('vidlink') || 
                           origin.includes('vidstuck') || 
                           origin.includes('vidsrc') || 
                           origin.includes('embed.su') ||
                           origin.includes('autoembed') ||
                           origin.includes('vidking');
      if (isKnownEmbed) {
        setLoaded(true);
      }
      if (!isPlayerOrigin) return;
      const data = parseVidkingMessage(e);
      if (data) {
        setLoaded(true);
        if (onPlayerEvent) onPlayerEvent(data);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [onPlayerEvent, isPlayerOrigin]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => console.error(err));
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleTheater = () => {
    if (isFullscreen) {
      document.exitFullscreen?.();
    }
    setIsTheater(!isTheater);
    
    setTimeout(() => {
      window.scrollTo({
        top: isTheater ? 0 : 40,
        behavior: 'smooth'
      });
    }, 100);
  };

  return (
    <div className={cn("w-full bg-black relative transition-all duration-300 flex flex-col justify-center", isTheater ? "max-w-full lg:px-0" : "max-w-[1600px] mx-auto lg:px-6 lg:pb-6")}>
      
      {/* Alert states overlay */}
      <div className="absolute top-3 sm:top-16 right-3 sm:right-4 z-40 flex flex-col items-end gap-2 pointer-events-none">
        {timeoutState === 'soft' && !loaded && (
          <div className="pointer-events-auto bg-[#0A1428]/95 border border-cyan-500/40 text-slate-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm flex items-center gap-2 sm:gap-3 animate-in fade-in slide-in-from-top-2 shadow-2xl backdrop-blur-md">
            <span className="flex items-center gap-1 text-yellow-400 font-medium text-[11px] sm:text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> Connecting...
            </span>
            <button onClick={onRetry} className="underline font-semibold hover:text-yellow-400 text-xs">Retry</button>
            {onNextServer && (
              <button 
                onClick={onNextServer} 
                className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00F5FF] rounded-full text-xs font-semibold transition-colors border border-cyan-500/40 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Next Server
              </button>
            )}
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        className={cn(
          "relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center group mx-auto",
          !isTheater && "lg:rounded-xl shadow-2xl",
          isFullscreen ? "h-screen lg:rounded-none" : "max-h-[calc(100vh-64px)] max-w-[calc((100vh-64px)*16/9)]"
        )}
      >
        {/* Loading / Error States overlay - Smoothly transitions out so video is never stuck behind black box */}
        <div 
          className={cn(
            "absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050A14] overflow-hidden transition-all duration-500",
            loaded && timeoutState !== 'hard' ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          )}
        >
          {backdropPath && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 blur-md"
              style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${backdropPath})` }}
            />
          )}
          
          {timeoutState === 'hard' ? (
            <div className="relative z-10 flex flex-col items-center max-w-md mx-4 text-center p-5 sm:p-6 bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
              <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Connection Failed</h3>
              <p className="text-slate-400 text-xs sm:text-sm mb-5">
                The player could not load on this server. Switch to another server to continue watching immediately.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={onRetry}
                  className="px-4 sm:px-6 py-2 bg-[#00F5FF]/10 hover:bg-[#00F5FF]/20 text-[#00F5FF] rounded-full text-xs sm:text-sm font-bold transition-colors border border-[#00F5FF]/30"
                >
                  Try Again
                </button>
                {onNextServer && (
                  <button onClick={onNextServer} className="px-4 sm:px-6 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-bold rounded-full text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(0,245,255,0.3)]">
                    Switch Server
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center pointer-events-auto px-4 text-center">
              <div className="animate-pulse mb-4 sm:mb-6">
                <Logo className="h-8 sm:h-12 drop-shadow-[0_0_15px_rgba(0,245,255,0.5)]" />
              </div>
              <div className="flex items-center gap-2.5 text-[#00F5FF]">
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="font-bold tracking-wider uppercase text-xs sm:text-sm">Loading Player...</span>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-400 mt-1.5">
                Server: <span className="text-slate-200 font-semibold">{SERVERS[activeSource?.server_key || '']?.label || 'VidLink'}</span>
              </span>
              <div className="flex items-center gap-2.5 mt-3 sm:mt-4">
                <button 
                  onClick={() => setLoaded(true)}
                  className="px-3.5 py-1.5 bg-[#00F5FF]/20 hover:bg-[#00F5FF]/30 text-[#00F5FF] rounded-full text-xs font-semibold transition-all border border-[#00F5FF]/40 flex items-center gap-1.5 shadow-lg"
                >
                  <MonitorPlay className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Show Player
                </button>
                {onNextServer && (
                  <button 
                    onClick={onNextServer} 
                    className="px-3 py-1.5 bg-white/10 hover:bg-[#00F5FF]/20 text-slate-300 hover:text-white rounded-full text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3 text-[#00F5FF]" /> Switch
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* The Player - Always rendered cleanly with no-referrer for maximum embed compatibility */}
        <iframe
          ref={iframeRef}
          key={`${activeSource?.server_key || 'vidlink'}-${activeSource?.id || 0}-${retryCount}`}
          src={embedUrl}
          title={`Watch ${title}`}
          className="w-full h-full border-0 absolute inset-0 z-10"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share"
          allowFullScreen
          frameBorder="0"
          referrerPolicy="no-referrer"
          loading="eager"
          onLoad={() => setLoaded(true)}
        />

        {/* Host Control Request Prompt Notification Banner */}
        {isHost && pendingControlRequests && pendingControlRequests.length > 0 && (
          <div className="absolute top-4 left-4 z-40 max-w-sm w-[calc(100%-2rem)] sm:w-auto bg-[#0A1428]/95 border border-cyan-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-sm shrink-0">
                {pendingControlRequests[0].requesterAvatar || '🙋'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  <span className="text-cyan-400">{pendingControlRequests[0].requesterName}</span> requested player control
                </p>
                <p className="text-[10px] text-slate-400">Grant control to unlock shared playback?</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onGrantControl?.(pendingControlRequests[0].requesterId)}
                className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1"
                title="Approve control request"
              >
                <Check className="w-3.5 h-3.5" /> Grant
              </button>
              <button
                onClick={() => onDeclineControl?.(pendingControlRequests[0].requesterId)}
                className="p-1.5 bg-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                title="Decline request"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Member Feedback Toast */}
        {controlFeedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#0A1428]/95 border border-cyan-500/50 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 pointer-events-auto max-w-[90%]">
            <span className="truncate">{controlFeedback}</span>
            {onDismissFeedback && (
              <button onClick={onDismissFeedback} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Member Synced Floating Badge */}
        {partyCode && onlyHostControls && !isHost && (
          <div className="absolute bottom-3 left-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 bg-[#0A1428]/85 border border-cyan-500/30 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-[11px] font-bold text-slate-200">Screen Synced with Host</span>
          </div>
        )}

        {/* Desktop Controls overlay */}
        <div 
          className="hidden sm:flex absolute top-4 right-4 z-30 justify-end gap-2.5 pointer-events-none flex-wrap"
        >
          {partyCode && onlyHostControls && !isHost && (
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <div className="h-10 px-3.5 flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full backdrop-blur-md text-xs font-bold">
                <span>🔒 Host Controls</span>
              </div>
              {onRequestControl && (
                <button
                  onClick={onRequestControl}
                  disabled={isControlRequestPending}
                  className={cn(
                    "h-10 px-3.5 flex items-center gap-1.5 rounded-full backdrop-blur-md text-xs font-bold transition-all border shadow-lg cursor-pointer",
                    isControlRequestPending
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 opacity-80 cursor-wait"
                      : "bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.4)] active:scale-95"
                  )}
                  title="Request permission from host to control the player"
                >
                  {isControlRequestPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>Requested...</span>
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="w-3.5 h-3.5 text-black" />
                      <span>Request Control</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          {onPrevEpisode && (
            <button
              onClick={onPrevEpisode}
              disabled={Boolean(partyCode && onlyHostControls && !isHost)}
              className={cn(
                "h-10 px-4 flex items-center justify-center bg-black/60 hover:bg-[#00F5FF]/20 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10 pointer-events-auto font-semibold text-sm",
                partyCode && onlyHostControls && !isHost && "opacity-40 cursor-not-allowed hover:bg-black/60"
              )}
              title={partyCode && onlyHostControls && !isHost ? "Host controls episode navigation" : "Previous Episode"}
            >
              Prev Ep
            </button>
          )}
          {onNextEpisode && (
            <button
              onClick={onNextEpisode}
              disabled={Boolean(partyCode && onlyHostControls && !isHost)}
              className={cn(
                "h-10 px-4 flex items-center justify-center bg-black/60 hover:bg-[#00F5FF]/20 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10 pointer-events-auto font-semibold text-sm",
                partyCode && onlyHostControls && !isHost && "opacity-40 cursor-not-allowed hover:bg-black/60"
              )}
              title={partyCode && onlyHostControls && !isHost ? "Host controls episode navigation" : "Next Episode"}
            >
              Next Ep
            </button>
          )}
          {sources && activeSource && onSelectSource && (
            partyCode && onlyHostControls && !isHost ? (
              <div 
                className="h-10 px-3.5 flex items-center gap-1.5 bg-black/60 text-slate-400 border border-white/10 rounded-full backdrop-blur-sm text-xs font-semibold pointer-events-auto opacity-70"
                title="Server is managed by the party host"
              >
                <span>Server: {SERVERS[activeSource.server_key]?.label || 'VidLink'}</span>
              </div>
            ) : (
              <ServerButton sources={sources} activeSource={activeSource} onSelect={onSelectSource} />
            )
          )}
          <button
            onClick={toggleTheater}
            className="w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-[#00F5FF]/20 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10 pointer-events-auto"
            title={isTheater ? "Default View" : "Theater Mode"}
          >
            <MonitorPlay className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-[#00F5FF]/20 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10 pointer-events-auto"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Player Action Bar (Clean touch-first toolbar immediately below video) */}
      <div className="flex sm:hidden w-full px-3 py-2 bg-[#050A14] border-b border-white/10 items-center justify-between gap-1.5 z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          {sources && activeSource && onSelectSource && (
            partyCode && onlyHostControls && !isHost ? (
              <div className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-bold text-slate-300">
                <span>{SERVERS[activeSource.server_key]?.label || 'VidLink'}</span>
              </div>
            ) : (
              <ServerButton sources={sources} activeSource={activeSource} onSelect={onSelectSource} compact={true} />
            )
          )}
          {partyCode && onlyHostControls && !isHost && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Host Locked
              </span>
              {onRequestControl && (
                <button
                  onClick={onRequestControl}
                  disabled={isControlRequestPending}
                  className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 border",
                    isControlRequestPending
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-cyan-500 text-black font-extrabold border-cyan-400 active:scale-95 shadow-[0_0_8px_rgba(0,245,255,0.3)]"
                  )}
                >
                  {isControlRequestPending ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                      <span>Pending</span>
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="w-2.5 h-2.5 text-black" />
                      <span>Request</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onPrevEpisode && (
            <button
              onClick={onPrevEpisode}
              disabled={Boolean(partyCode && onlyHostControls && !isHost)}
              className={cn(
                "h-9 px-3 flex items-center justify-center bg-white/5 active:bg-white/20 text-white rounded-full transition-colors border border-white/10 font-semibold text-xs touch-manipulation",
                partyCode && onlyHostControls && !isHost && "opacity-40 cursor-not-allowed"
              )}
            >
              Prev
            </button>
          )}
          {onNextEpisode && (
            <button
              onClick={onNextEpisode}
              disabled={Boolean(partyCode && onlyHostControls && !isHost)}
              className={cn(
                "h-9 px-3 flex items-center justify-center bg-white/5 active:bg-white/20 text-white rounded-full transition-colors border border-white/10 font-semibold text-xs touch-manipulation",
                partyCode && onlyHostControls && !isHost && "opacity-40 cursor-not-allowed"
              )}
            >
              Next
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 flex items-center justify-center bg-white/5 active:bg-cyan-500/20 text-white rounded-full transition-colors border border-white/10 touch-manipulation"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
