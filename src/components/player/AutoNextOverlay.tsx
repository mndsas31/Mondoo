import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, X, Film, Tv, Clock, Sparkles, ChevronRight, Home, Users } from 'lucide-react';
import { Media, MediaDetails, Episode } from '../../types';
import { getSeasonDetails, getImageUrl } from '../../services/tmdbApi';
import { cn } from '../../utils/cn';

interface AutoNextOverlayProps {
  isOpen: boolean;
  mediaType: 'movie' | 'tv';
  mediaDetails: MediaDetails | null;
  currentSeason?: number;
  currentEpisode?: number;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onReplay?: () => void;
  onCancel?: () => void;
  partyCode?: string | null;
  isHost?: boolean;
  onlyHostControls?: boolean;
  similarMedia?: Media[];
  onSelectMedia?: (media: Media) => void;
}

export const AutoNextOverlay: React.FC<AutoNextOverlayProps> = ({
  isOpen,
  mediaType,
  mediaDetails,
  currentSeason = 1,
  currentEpisode = 1,
  onNextEpisode,
  onReplay,
  onCancel,
  partyCode = null,
  isHost = true,
  onlyHostControls = false,
  similarMedia = [],
  onSelectMedia
}) => {
  const [countdown, setCountdown] = useState(10);
  const [isPaused, setIsPaused] = useState(false);
  const [nextEpisodeData, setNextEpisodeData] = useState<Episode | null>(null);
  const [nextSeasonNum, setNextSeasonNum] = useState<number>(currentSeason);
  const [nextEpisodeNum, setNextEpisodeNum] = useState<number>(currentEpisode + 1);
  const [hasNextEpisode, setHasNextEpisode] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate and fetch next episode details
  useEffect(() => {
    if (mediaType !== 'tv' || !mediaDetails?.seasons) {
      setHasNextEpisode(false);
      return;
    }

    let targetSeason = currentSeason;
    let targetEpisode = currentEpisode + 1;
    let exists = false;

    const currentSeasonObj = mediaDetails.seasons.find(s => s.season_number === currentSeason);
    if (currentSeasonObj && targetEpisode <= currentSeasonObj.episode_count) {
      exists = true;
    } else {
      // Check next season
      const nextSeasonObj = mediaDetails.seasons.find(s => s.season_number === currentSeason + 1);
      if (nextSeasonObj && nextSeasonObj.episode_count > 0) {
        targetSeason = currentSeason + 1;
        targetEpisode = 1;
        exists = true;
      }
    }

    setHasNextEpisode(exists);
    setNextSeasonNum(targetSeason);
    setNextEpisodeNum(targetEpisode);

    if (exists && mediaDetails.id) {
      setLoadingNext(true);
      getSeasonDetails(mediaDetails.id, targetSeason)
        .then(res => {
          const ep = res.data.episodes?.find(e => e.episode_number === targetEpisode);
          if (ep) {
            setNextEpisodeData(ep);
          } else {
            setNextEpisodeData(null);
          }
        })
        .catch(() => {
          setNextEpisodeData(null);
        })
        .finally(() => {
          setLoadingNext(false);
        });
    }
  }, [mediaType, mediaDetails, currentSeason, currentEpisode]);

  // Reset & start countdown when overlay opens
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(10);
      setIsPaused(false);
      return;
    }

    // If viewer is in watch party and not host, don't auto-advance timer on their own
    if (partyCode && onlyHostControls && !isHost) {
      return;
    }

    // Only start countdown if there's a next episode for TV
    if (mediaType === 'tv' && hasNextEpisode) {
      setCountdown(10);
      setIsPaused(false);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            onNextEpisode?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, mediaType, hasNextEpisode, partyCode, onlyHostControls, isHost, onNextEpisode]);

  const handlePauseTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPaused(true);
  };

  const handleResumeTimer = () => {
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onNextEpisode?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (!isOpen) return null;

  const title = mediaDetails?.title || mediaDetails?.name || 'Video';
  const poster = nextEpisodeData?.still_path 
    ? getImageUrl(nextEpisodeData.still_path, 'w500') 
    : mediaDetails?.backdrop_path 
      ? getImageUrl(mediaDetails.backdrop_path, 'w500')
      : '';

  // SVG Circular progress radius
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (countdown / 10) * circumference;

  return (
    <div className="absolute inset-0 z-45 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      {/* Container card */}
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#0A1428]/98 to-[#050A14]/98 border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,245,255,0.25)] text-white overflow-hidden flex flex-col gap-4">
        
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar with close button */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400">
                {mediaType === 'tv' && hasNextEpisode ? 'Auto Continue Watching' : 'Playback Finished'}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[280px] sm:max-w-md">
                {title}
              </h3>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/10"
            title="Stay on this screen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: TV Next Episode Case */}
        {mediaType === 'tv' && hasNextEpisode ? (
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4">
            {/* Episode Preview Thumbnail */}
            <div className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/10 shadow-lg group">
              {poster ? (
                <img 
                  src={poster} 
                  alt={nextEpisodeData?.name || `Season ${nextSeasonNum} Episode ${nextEpisodeNum}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Tv className="w-8 h-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[11px] font-bold text-cyan-300">
                  S{nextSeasonNum} E{nextEpisodeNum}
                </span>
              </div>
            </div>

            {/* Episode Info & Countdown */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-2 w-full text-center sm:text-left">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-extrabold uppercase">
                    Up Next
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Season {nextSeasonNum}, Ep {nextEpisodeNum}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1 truncate">
                  {nextEpisodeData?.name || `Episode ${nextEpisodeNum}`}
                </h4>
                {nextEpisodeData?.overview && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {nextEpisodeData.overview}
                  </p>
                )}
              </div>

              {/* Countdown indicator */}
              {!(partyCode && onlyHostControls && !isHost) ? (
                <div className="flex items-center justify-center sm:justify-start gap-3 mt-1">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="w-10 h-10 -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r={radius}
                        className="stroke-white/10"
                        strokeWidth="3"
                        fill="transparent"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r={radius}
                        className="stroke-cyan-400 transition-all duration-1000 ease-linear"
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute font-mono font-black text-xs text-white">
                      {countdown}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">
                      {isPaused ? 'Auto-play Paused' : `Playing in ${countdown}s`}
                    </span>
                    <button
                      onClick={isPaused ? handleResumeTimer : handlePauseTimer}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                    >
                      {isPaused ? 'Resume countdown' : 'Pause countdown'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                  <Users className="w-3.5 h-3.5" />
                  <span>Host will advance the watch party to the next episode.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Movie Completed or Series Finale Case */
          <div className="relative z-10 flex flex-col items-center text-center py-2 gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">You've finished watching {title}!</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved to your completed history. Replay or explore recommendations below.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-white/10">
          <div className="flex items-center gap-2">
            {onReplay && (
              <button
                onClick={onReplay}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-white/10 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {mediaType === 'tv' && hasNextEpisode && onNextEpisode && (
            <button
              onClick={onNextEpisode}
              disabled={Boolean(partyCode && onlyHostControls && !isHost)}
              className={cn(
                "px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all cursor-pointer active:scale-95",
                partyCode && onlyHostControls && !isHost && "opacity-50 cursor-not-allowed"
              )}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Watch Next Episode (S{nextSeasonNum} E{nextEpisodeNum})</span>
            </button>
          )}
        </div>

        {/* Similar / Recommendations Carousel if Movie or Finale */}
        {similarMedia && similarMedia.length > 0 && (!hasNextEpisode || mediaType === 'movie') && (
          <div className="relative z-10 pt-2 border-t border-white/10 flex flex-col gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 text-left">
              Recommended for you
            </span>
            <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
              {similarMedia.slice(0, 6).map(sim => (
                <div
                  key={sim.id}
                  onClick={() => onSelectMedia?.(sim)}
                  className="w-24 shrink-0 bg-black/40 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-400 transition-all cursor-pointer group"
                >
                  <div className="aspect-[2/3] relative">
                    {sim.poster_path ? (
                      <img 
                        src={getImageUrl(sim.poster_path, 'w500')} 
                        alt={sim.title || sim.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="p-1 text-[10px] font-bold text-white truncate text-left">
                    {sim.title || sim.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
