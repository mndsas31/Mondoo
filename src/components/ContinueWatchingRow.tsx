import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, Info, X, Trash2, Clock, Check, ChevronLeft, ChevronRight, Tv, Film } from 'lucide-react';
import { ContinueWatchingItem } from '../hooks/useContinueWatching';
import { getImageUrl } from '../services/tmdbApi';
import { Media } from '../types';
import { cn } from '../utils/cn';

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onOpenModal: (media: Media) => void;
  onRemoveItem: (mediaId: number) => void;
  onClearAll: () => void;
  onStartWatchParty?: (item: ContinueWatchingItem) => void;
}

export const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({
  items,
  onOpenModal,
  onRemoveItem,
  onClearAll,
  onStartWatchParty
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
      scrollRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleResume = (item: ContinueWatchingItem) => {
    const mType = item.media_type || item.media?.media_type || (item.season ? 'tv' : 'movie');
    const activePartyCode = sessionStorage.getItem('active_party_code');
    const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';

    if (mType === 'tv' && item.season && item.episode) {
      navigate(`/watch/tv/${item.media.id}/season/${item.season}/episode/${item.episode}${partyQuery}`);
    } else {
      navigate(`/watch/${mType}/${item.media.id}${partyQuery}`);
    }
  };

  const handlePartyLaunch = (e: React.MouseEvent, item: ContinueWatchingItem) => {
    e.stopPropagation();
    if (onStartWatchParty) {
      onStartWatchParty(item);
    } else {
      const mType = item.media_type || item.media?.media_type || (item.season ? 'tv' : 'movie');
      let targetUrl = `/watch/${mType}/${item.media.id}`;
      if (mType === 'tv' && item.season && item.episode) {
        targetUrl += `/season/${item.season}/episode/${item.episode}`;
      }
      navigate(targetUrl);
    }
  };

  const handleRemove = (e: React.MouseEvent, mediaId: number) => {
    e.stopPropagation();
    setRemovingId(mediaId);
    setTimeout(() => {
      onRemoveItem(mediaId);
      setRemovingId(null);
    }, 250);
  };

  const formatRemainingTime = (progressSec: number, durationSec: number) => {
    if (!durationSec || durationSec <= 0) return null;
    const remaining = Math.max(0, durationSec - progressSec);
    if (remaining < 60) return '< 1m left';
    const mins = Math.floor(remaining / 60);
    if (mins < 60) return `${mins}m left`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m left`;
  };

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return null;
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative mb-10 group/cw select-none">
      {/* Section Header */}
      <div className="px-4 md:px-10 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-400 via-teal-400 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
          <div className="flex items-center gap-2.5">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">
              Continue Watching
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {items.length} {items.length === 1 ? 'in progress' : 'in progress'}
            </span>
          </div>
        </div>

        {/* Clear All Controls */}
        <div className="flex items-center gap-3">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/40 px-3 py-1.5 rounded-xl shadow-lg animate-in fade-in zoom-in-95">
              <span className="text-xs text-rose-200 font-medium">Clear history?</span>
              <button
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[11px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
              title="Clear all continue watching items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear List</span>
            </button>
          )}

          {/* Arrow navigation buttons */}
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <button
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className={cn(
                "p-2 rounded-xl bg-slate-900/80 border border-white/10 text-white backdrop-blur-md transition-all",
                canScrollLeft ? "hover:bg-cyan-500/20 hover:border-cyan-500/40 cursor-pointer shadow-md" : "opacity-30 cursor-not-allowed"
              )}
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className={cn(
                "p-2 rounded-xl bg-slate-900/80 border border-white/10 text-white backdrop-blur-md transition-all",
                canScrollRight ? "hover:bg-cyan-500/20 hover:border-cyan-500/40 cursor-pointer shadow-md" : "opacity-30 cursor-not-allowed"
              )}
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 md:gap-5 overflow-x-auto px-4 md:px-10 pb-4 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {items.map((item) => {
          const media = item.media;
          const isTv = item.media_type === 'tv' || media.media_type === 'tv' || ((media as any).first_air_date && !media.release_date) || Boolean(item.season);
          const title = media.title || media.name || (media as any).original_title || 'Untitled';
          const imagePath = media.backdrop_path || media.poster_path;
          const duration = item.duration_seconds || 5400;
          const progress = item.progress_seconds || 0;
          const percentage = duration > 0 ? Math.min(100, Math.max(5, (progress / duration) * 100)) : 15;
          const remainingText = formatRemainingTime(progress, duration);
          const relativeTime = formatRelativeTime(item.last_watched);
          const isRemoving = removingId === media.id;

          return (
            <div
              key={`${media.id}-${item.season || 0}-${item.episode || 0}`}
              onClick={() => handleResume(item)}
              className={cn(
                "group/card shrink-0 snap-start relative flex flex-col gap-2.5 transition-all duration-300 ease-out cursor-pointer transform-gpu",
                "w-[260px] sm:w-[290px] md:w-[320px] lg:w-[340px]",
                isRemoving ? "opacity-0 scale-95 pointer-events-none" : "hover:-translate-y-1.5 hover:z-30"
              )}
            >
              {/* Media Card Container */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-lg group-hover/card:border-cyan-400/60 group-hover/card:shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all duration-300">
                {/* Backdrop Image */}
                {imagePath ? (
                  <img
                    src={getImageUrl(imagePath, 'w780')}
                    alt={title}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 brightness-[0.88] group-hover/card:brightness-100"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                    {isTv ? <Tv className="w-12 h-12 text-slate-700" /> : <Film className="w-12 h-12 text-slate-700" />}
                  </div>
                )}

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

                {/* Top Badges & Remove Button */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20">
                  <div className="flex items-center gap-1.5">
                    {isTv ? (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-500/80 text-white backdrop-blur-md shadow-md flex items-center gap-1">
                        <Tv className="w-3 h-3" />
                        <span>S{item.season || 1}:E{item.episode || 1}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyan-500/80 text-white backdrop-blur-md shadow-md flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        <span>Movie</span>
                      </span>
                    )}

                    {relativeTime && (
                      <span className="hidden sm:inline-flex px-2 py-0.5 rounded-lg text-[10px] font-medium bg-black/50 text-slate-300 backdrop-blur-md border border-white/10 items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{relativeTime}</span>
                      </span>
                    )}
                  </div>

                  {/* Top Right Quick Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenModal(media);
                      }}
                      className="p-1.5 rounded-xl bg-black/60 hover:bg-cyan-500/40 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover/card:opacity-100 transition-all hover:scale-110 cursor-pointer shadow-md"
                      title="View Details"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleRemove(e, media.id)}
                      className="p-1.5 rounded-xl bg-black/60 hover:bg-rose-500/80 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover/card:opacity-100 transition-all hover:scale-110 cursor-pointer shadow-md"
                      title="Remove from Continue Watching"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Big Center Play / Resume Button on Hover */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 border border-cyan-300/40 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] transform scale-90 opacity-80 group-hover/card:scale-110 group-hover/card:opacity-100 transition-all duration-300">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Bottom Card Hover Quick Bar */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between z-20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handlePartyLaunch(e, item)}
                      className="px-2.5 py-1 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-lg transition-all hover:scale-105 cursor-pointer"
                      title="Start Watch Party with friends"
                    >
                      <Users className="w-3 h-3" />
                      <span>Party</span>
                    </button>
                  </div>

                  {remainingText && (
                    <span className="text-[11px] font-semibold text-cyan-200 bg-black/70 px-2 py-0.5 rounded-lg backdrop-blur-md border border-cyan-500/20">
                      {remainingText}
                    </span>
                  )}
                </div>

                {/* Progress Bar (Glow Bottom Strip) */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20 z-20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 transition-all duration-300 shadow-[0_0_10px_#22d3ee]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Title & Episode Information */}
              <div className="flex flex-col px-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-white text-sm font-semibold truncate group-hover/card:text-cyan-300 transition-colors">
                    {title}
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-mono shrink-0">
                    {Math.round(percentage)}%
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
                  {isTv ? (
                    <span className="text-slate-300 font-medium truncate">
                      {item.episode_title ? `E${item.episode || 1}: ${item.episode_title}` : `Season ${item.season || 1}, Episode ${item.episode || 1}`}
                    </span>
                  ) : (
                    <span>Movie</span>
                  )}
                  {remainingText && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">{remainingText}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
