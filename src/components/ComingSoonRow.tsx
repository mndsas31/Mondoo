import React, { useRef } from 'react';
import { Media } from '../types';
import { getImageUrl } from '../services/tmdbApi';
import { ChevronLeft, ChevronRight, Calendar, Star, Info, Bell, Sparkles } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';

interface ComingSoonRowProps {
  items: Media[];
  onOpenModal: (item: Media) => void;
  onExploreAll?: () => void;
}

export const ComingSoonRow: React.FC<ComingSoonRowProps> = ({
  items,
  onOpenModal,
  onExploreAll
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? scrollLeft - clientWidth + 100 : scrollLeft + clientWidth - 100;
      rowRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const formatReleaseDate = (dateString?: string) => {
    if (!dateString) return 'Coming Soon';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Sort upcoming items by release_date if possible or keep order
  const validItems = items.filter(item => item.poster_path || item.backdrop_path);

  if (validItems.length === 0) return null;

  return (
    <div className="relative mb-10 group/comingsoon">
      {/* Section Header */}
      <div className="px-4 md:px-10 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight flex items-center">
                Coming Soon
              </h2>
              <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Upcoming
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Be the first to know about upcoming cinematic releases and blockbusters
            </p>
          </div>
        </div>

        {onExploreAll && (
          <button
            onClick={onExploreAll}
            className="text-amber-400 text-sm font-semibold hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            Explore All Upcoming &gt;
          </button>
        )}
      </div>

      {/* Carousel */}
      <div className="relative">
        <div
          className="absolute top-0 bottom-[40px] left-0 w-12 bg-[#0A1428]/80 backdrop-blur-sm z-30 hidden sm:flex items-center justify-center opacity-0 group-hover/comingsoon:opacity-100 transition-opacity cursor-pointer rounded-r-2xl border-r border-white/10"
          onClick={() => handleScroll('left')}
        >
          <ChevronLeft className="text-white w-8 h-8 hover:text-amber-400 transition-colors" />
        </div>

        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-4 snap-x snap-mandatory scroll-smooth"
        >
          {validItems.map((item) => {
            const title = item.title || item.name || item.original_title;
            const formattedDate = formatReleaseDate(item.release_date);
            const inWatchlist = isInWatchlist(item.id);

            return (
              <div
                key={item.id}
                className="group/card cursor-pointer shrink-0 snap-start flex flex-col gap-2.5 w-[200px] sm:w-[230px] md:w-[250px] lg:w-[270px] transition-all duration-300 hover:-translate-y-1.5"
                onClick={() => onOpenModal(item)}
              >
                {/* Poster Container */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A1428] aspect-[2/3] transition-all duration-300 group-hover/card:border-amber-500/50 group-hover/card:shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                  <img
                    src={getImageUrl(item.poster_path || item.backdrop_path || '', 'w500')}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                    loading="lazy"
                  />

                  {/* Top Badge: Release Date */}
                  <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-xl border border-amber-500/40 text-[11px] font-extrabold text-amber-300 flex items-center gap-1.5 shadow-lg">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>{formattedDate}</span>
                  </div>

                  {/* Watchlist Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (inWatchlist) {
                        removeFromWatchlist(item.id);
                      } else {
                        addToWatchlist(item);
                      }
                    }}
                    className={`absolute top-3 right-3 z-20 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                      inWatchlist 
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' 
                        : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80 border border-white/10'
                    }`}
                    title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist / Remind Me'}
                  >
                    <Bell className="w-3.5 h-3.5 fill-current" />
                  </button>

                  {/* Overlay Gradient & Details on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {item.vote_average ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                          <Star className="w-3 h-3 fill-current" />
                          {item.vote_average.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                          Unreleased
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                        {item.media_type === 'tv' ? 'TV Series' : 'Movie'}
                      </span>
                    </div>

                    <h4 className="text-white font-bold text-sm sm:text-base line-clamp-1 group-hover/card:text-amber-300 transition-colors">
                      {title}
                    </h4>

                    {item.overview && (
                      <p className="text-slate-300 text-xs line-clamp-2 mt-1 hidden sm:block opacity-90 font-normal">
                        {item.overview}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      <span className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md">
                        <Info className="w-3.5 h-3.5" />
                        <span>Preview & Details</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="absolute top-0 bottom-[40px] right-0 w-12 bg-[#0A1428]/80 backdrop-blur-sm z-30 hidden sm:flex items-center justify-center opacity-0 group-hover/comingsoon:opacity-100 transition-opacity cursor-pointer rounded-l-2xl border-l border-white/10"
          onClick={() => handleScroll('right')}
        >
          <ChevronRight className="text-white w-8 h-8 hover:text-amber-400 transition-colors" />
        </div>
      </div>
    </div>
  );
};
