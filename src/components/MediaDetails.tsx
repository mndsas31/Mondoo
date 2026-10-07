import React from 'react';
import { Play, Plus, Check } from 'lucide-react';
import { getImageUrl } from '../services/tmdbApi';
import { MediaDetails as MediaDetailsType, Cast } from '../types';
import { useWatchlist } from '../context/WatchlistContext';
import { useAuth } from '../context/AuthContext';

interface MediaDetailsProps {
  details: MediaDetailsType;
  type: 'movie' | 'tv';
  cast: Cast[];
}

export const MediaDetails: React.FC<MediaDetailsProps> = ({ details, type, cast }) => {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { user, openAuthModal } = useAuth();
  
  const inList = isInWatchlist(details.id);

  const handleWatchlist = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (inList) {
      removeFromWatchlist(details.id);
    } else {
      addToWatchlist({ ...details, media_type: type });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 sm:py-8 w-full">
      <div className="flex flex-col md:flex-row gap-5 md:gap-8">
        {/* Desktop Poster */}
        <div className="hidden md:block w-52 flex-shrink-0">
          <img
            src={getImageUrl(details.poster_path, 'w500')}
            alt={details.title || details.name}
            className="w-full rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10"
          />
        </div>

        <div className="flex-1">
          {/* Mobile Header with small thumbnail */}
          <div className="flex gap-4 items-start md:hidden mb-3">
            {details.poster_path && (
              <img
                src={getImageUrl(details.poster_path, 'w500')}
                alt={details.title || details.name}
                className="w-20 h-28 object-cover rounded-lg shadow-md border border-white/10 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 tracking-tight">
                {details.title || details.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
                <span className="text-[#00F5FF] font-bold">★ {details.vote_average?.toFixed(1)}</span>
                <span>·</span>
                <span>{(details.release_date || details.first_air_date)?.slice(0, 4)}</span>
                <span>·</span>
                {type === 'movie' ? (
                  <span>{Math.floor(details.runtime! / 60)}h {details.runtime! % 60}m</span>
                ) : (
                  <span>{details.number_of_seasons} Season{details.number_of_seasons !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Title & Metadata */}
          <div className="hidden md:flex flex-wrap items-center gap-3 text-sm text-slate-300 font-medium mb-3">
            <span className="text-[#00F5FF] font-semibold">{details.vote_average?.toFixed(1)} Rating</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>{(details.release_date || details.first_air_date)?.slice(0, 4)}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            {type === 'movie' ? (
              <span>{Math.floor(details.runtime! / 60)}h {details.runtime! % 60}m</span>
            ) : (
              <span>{details.number_of_seasons} Seasons</span>
            )}
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="px-2 py-0.5 border border-slate-600 rounded text-xs font-mono">HD</span>
          </div>

          <h1 className="hidden md:block text-3xl lg:text-5xl font-black text-white mb-5 tracking-tight">
            {details.title || details.name}
          </h1>

          <div className="flex items-center gap-3 mb-5 sm:mb-7">
            <button 
              onClick={handleWatchlist}
              className="flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition-all border border-slate-700 hover:border-slate-600 touch-manipulation active:scale-95"
            >
              {inList ? <Check className="w-4 h-4 text-[#00F5FF]" /> : <Plus className="w-4 h-4" />}
              {inList ? 'In Watchlist' : 'Add to Watchlist'}
            </button>
          </div>

          <p className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-3xl mb-6">
            {details.overview}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm">
            {cast && cast.length > 0 && (
              <div>
                <span className="text-slate-500 block mb-1 font-medium uppercase tracking-wider text-[11px]">Cast</span>
                <p className="text-slate-300 leading-relaxed">
                  {cast.slice(0, 5).map(c => c.name).join(', ')}
                </p>
              </div>
            )}
            {details.genres && details.genres.length > 0 && (
              <div>
                <span className="text-slate-500 block mb-1 font-medium uppercase tracking-wider text-[11px]">Genres</span>
                <div className="flex flex-wrap gap-1.5">
                  {details.genres.map(g => (
                    <span key={g.id} className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-xs">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
