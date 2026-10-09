import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Trash2, Clock, Check, ChevronLeft, ChevronRight, History, X } from 'lucide-react';
import { RecentlyWatchedItem } from '../hooks/useRecentlyWatched';
import { getImageUrl } from '../services/tmdbApi';
import { Media } from '../types';
import { cn } from '../utils/cn';

interface RecentlyWatchedRowProps {
  items: RecentlyWatchedItem[];
  onOpenModal: (media: Media) => void;
  onRemoveItem: (mediaId: number) => void;
  onClearAll: () => void;
}

export const RecentlyWatchedRow: React.FC<RecentlyWatchedRowProps> = ({
  items,
  onOpenModal,
  onRemoveItem,
  onClearAll
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

  const handlePlay = (e: React.MouseEvent, item: RecentlyWatchedItem) => {
    e.stopPropagation();
    const mType = item.media.media_type || ((item.media as any).first_air_date ? 'tv' : 'movie');
    const activePartyCode = sessionStorage.getItem('active_party_code');
    const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';

    if (mType === 'tv' && (item as any).season && (item as any).episode) {
      navigate(`/watch/tv/${item.media.id}/season/${(item as any).season}/episode/${(item as any).episode}${partyQuery}`);
    } else {
      navigate(`/watch/${mType}/${item.media.id}${partyQuery}`);
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
    <div className="relative mb-12 group/rw select-none animate-in fade-in duration-300">
      {/* Section Header */}
      <div className="px-4 md:px-10 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-full shadow-[0_0_12px_rgba(0,245,255,0.6)]" />
          <div className="flex items-center gap-2.5">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">
              Recently Watched
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,245,255,0.15)] flex items-center gap-1">
              <History className="w-3 h-3 text-cyan-400" /> Local History
            </span>
          </div>
        </div>

        {/* Clear History Button & Confirmation */}
        <div className="relative">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 bg-[#0A1428] border border-cyan-500/40 rounded-xl px-3 py-1 animate-in zoom-in-95 duration-150 shadow-xl z-30">
              <span className="text-xs font-semibold text-slate-300">Clear history?</span>
              <button 
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
              >
                Yes
              </button>
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="p-0.5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer"
              title="Clear recently watched history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-r from-[#050A14] via-[#050A14]/80 to-transparent flex items-center justify-center text-white hover:text-cyan-400 transition-all cursor-pointer backdrop-blur-[2px]"
            title="Scroll Left"
          >
            <ChevronLeft className="w-8 h-8 drop-shadow-md" />
          </button>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-l from-[#050A14] via-[#050A14]/80 to-transparent flex items-center justify-center text-white hover:text-cyan-400 transition-all cursor-pointer backdrop-blur-[2px]"
            title="Scroll Right"
          >
            <ChevronRight className="w-8 h-8 drop-shadow-md" />
          </button>
        )}

        {/* Horizontal Card Row */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-4 pt-1 snap-x snap-mandatory scroll-smooth"
        >
          {items.map((item) => {
            const media = item.media;
            const title = media.title || media.name || 'Untitled';
            const mType = media.media_type || ((media as any).first_air_date ? 'tv' : 'movie');
            const backdrop = media.backdrop_path || media.poster_path;
            const poster = media.poster_path || media.backdrop_path;
            const relativeTime = formatRelativeTime(item.openedAt);
            const isRemoving = removingId === media.id;

            return (
              <div
                key={`${media.id}-${item.openedAt}`}
                onClick={() => onOpenModal(media)}
                className={cn(
                  "group relative shrink-0 snap-start w-[240px] sm:w-[280px] md:w-[310px] bg-[#0A1428] rounded-2xl border border-white/10 hover:border-cyan-400/60 overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,245,255,0.25)] hover:-translate-y-1 cursor-pointer flex flex-col justify-between",
                  isRemoving && "scale-90 opacity-0 duration-200"
                )}
              >
                {/* Backdrop Image Container */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                  <img
                    src={getImageUrl(backdrop || poster, 'w780')}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 group-hover:brightness-110"
                    loading="lazy"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1428] via-[#0A1428]/40 to-transparent" />

                  {/* Top Badge: Relative Time */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-200 border border-white/10">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{relativeTime || 'Recently'}</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemove(e, media.id)}
                    className="absolute top-2.5 right-2.5 z-20 w-7 h-7 bg-black/70 hover:bg-rose-500/80 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/10 cursor-pointer shadow-lg"
                    title="Remove from recently watched"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Play Overlay Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                    <div 
                      onClick={(e) => handlePlay(e, item)}
                      className="w-12 h-12 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.6)] transform group-hover:scale-110 transition-all pointer-events-auto cursor-pointer"
                      title="Watch Now"
                    >
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Info Footer */}
                <div className="p-3.5 flex items-center justify-between gap-2 border-t border-white/5 bg-[#0A1428]">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white text-xs sm:text-sm font-bold truncate group-hover:text-cyan-300 transition-colors">
                      {title}
                    </h4>
                    <p className="text-[11px] text-slate-400 capitalize mt-0.5 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-white/5 rounded text-[10px] font-semibold uppercase text-slate-300 border border-white/10">
                        {mType === 'tv' ? 'TV Series' : 'Movie'}
                      </span>
                      {media.release_date || (media as any).first_air_date ? (
                        <span>&middot; {(media.release_date || (media as any).first_air_date || '').split('-')[0]}</span>
                      ) : null}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenModal(media);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10 shrink-0"
                    title="View Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
