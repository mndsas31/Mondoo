import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, Flame, Play, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, getImageUrl } from '../services/tmdbApi';
import { Media } from '../types';
import { cn } from '../utils/cn';

interface TrendingNowCarouselProps {
  onOpenModal: (media: Media) => void;
}

type TabType = 'all' | 'movie' | 'tv';

export const TrendingNowCarousel: React.FC<TrendingNowCarouselProps> = ({ onOpenModal }) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const response = await api.getTrending(activeTab, 'week');
        if (active) {
          // Sort items by vote average to make sure top-rated are emphasized
          const sorted = (response.data.results || []).sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
          setItems(sorted);
        }
      } catch (error) {
        console.error('Error fetching trending data inside carousel:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTrending();
    return () => {
      active = false;
    };
  }, [activeTab]);

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

  return (
    <div className="relative mb-12 group/trending select-none animate-in fade-in duration-300">
      {/* Section Header with Tabs */}
      <div className="px-4 md:px-10 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-full shadow-[0_0_12px_rgba(0,245,255,0.6)]" />
          <div className="flex items-center gap-2">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">
              Trending Now
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
              <Flame className="w-3 h-3 animate-pulse" /> Hot
            </span>
          </div>
        </div>

        {/* Tab Buttons styled as motion segmented filters */}
        <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10 self-start sm:self-auto relative">
          {(['all', 'movie', 'tv'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer z-10",
                  isActive ? "text-white font-bold" : "text-slate-400 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="trending-tab-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.4)] -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <span>{tab === 'all' ? 'All Hits' : tab === 'movie' ? 'Movies' : 'Series'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Navigation Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-r from-[#050A14] via-[#050A14]/85 to-transparent flex items-center justify-center text-white hover:text-cyan-400 transition-all cursor-pointer backdrop-blur-[1px]"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="w-8 h-8 drop-shadow-md" />
          </button>
        )}

        {/* Right Navigation Arrow */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-l from-[#050A14] via-[#050A14]/85 to-transparent flex items-center justify-center text-white hover:text-cyan-400 transition-all cursor-pointer backdrop-blur-[1px]"
            aria-label="Scroll Right"
          >
            <ChevronRight className="w-8 h-8 drop-shadow-md" />
          </button>
        )}

        {/* Carousel Row */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-6 pt-1 snap-x snap-mandatory scroll-smooth min-h-[160px]"
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="shrink-0 snap-start w-[240px] sm:w-[280px] md:w-[320px] aspect-video bg-[#0A1428]/40 rounded-2xl border border-white/5 animate-pulse flex items-center justify-center"
              >
                <div className="w-8 h-8 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="text-center py-10 w-full text-slate-400 text-sm">
              No trending hits available right now.
            </div>
          ) : (
            items.map((item, index) => {
              const title = item.title || item.name || item.original_title || 'Untitled';
              const mediaType = item.media_type || (activeTab === 'all' ? ((item as any).first_air_date ? 'tv' : 'movie') : activeTab);
              const imagePath = item.backdrop_path || item.poster_path;
              const year = (item.release_date || (item as any).first_air_date || '').split('-')[0] || '';
              const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
              const rank = index + 1;

              return (
                <motion.div
                  key={`${item.id}-${index}`}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  onClick={() => onOpenModal(item)}
                  className="group relative shrink-0 snap-start w-[240px] sm:w-[280px] md:w-[320px] bg-[#0A1428] rounded-2xl border border-white/10 hover:border-cyan-400/50 overflow-hidden transition-colors duration-300 hover:shadow-[0_10px_30px_rgba(0,245,255,0.2)] cursor-pointer flex flex-col justify-between"
                >
                  {/* Backdrop Cover */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                    {imagePath ? (
                      <img
                        src={getImageUrl(imagePath, 'w780')}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 group-hover:brightness-110"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-950 to-slate-900 flex items-center justify-center p-4">
                        <span className="text-white text-xs font-semibold text-center truncate">{title}</span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1428] via-[#0A1428]/35 to-transparent" />

                    {/* Left Rank Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center justify-center bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,245,255,0.2)] gap-1">
                      <span>Rank</span>
                      <span className="text-white">#{rank}</span>
                    </div>

                    {/* Rating Badge */}
                    {rating && (
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-400 border border-white/10">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{rating}</span>
                      </div>
                    )}

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <div className="w-11 h-11 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.6)] transform group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-3.5 flex items-center justify-between gap-3 bg-[#0A1428] border-t border-white/5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white text-xs sm:text-sm font-bold truncate group-hover:text-cyan-300 transition-colors">
                        {title}
                      </h4>
                      {/* Quiet Inline Metadata: Zero-Pill style with Separators */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-medium">
                        <span className="text-cyan-400 font-semibold uppercase tracking-wider text-[10px]">
                          {mediaType === 'tv' ? 'Series' : 'Movie'}
                        </span>
                        <span>·</span>
                        <span>{year || 'Released'}</span>
                        {item.popularity && (
                          <>
                            <span>·</span>
                            <span>{Math.round(item.popularity)} Views</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenModal(item);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10 shrink-0"
                      title="View Details"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
