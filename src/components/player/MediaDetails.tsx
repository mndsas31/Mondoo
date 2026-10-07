import React, { useState } from 'react';
import { Calendar, Star, Clock, Share2, Plus, Check } from 'lucide-react';
import { MediaDetails as MediaDetailsType, Cast } from '../../types';
import { cn } from '../../utils/cn';
import { getImageUrl } from '../../services/tmdbApi';

interface MediaDetailsProps {
  details: MediaDetailsType;
  cast: Cast[];
  mediaType: 'movie' | 'tv';
  isInWatchlist: boolean;
  onWatchlistClick: () => void;
  onShareClick: () => void;
}

export const MediaDetails: React.FC<MediaDetailsProps> = ({
  details,
  cast,
  mediaType,
  isInWatchlist,
  onWatchlistClick,
  onShareClick
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const title = details.title || details.name || '';
  const releaseYear = (details.release_date || details.first_air_date)?.split('-')[0];
  const runtime = details.runtime || (details.episode_run_time?.[0]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Left: Poster */}
        <div className="hidden md:block w-52 flex-shrink-0">
          <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-800 shadow-[0_0_30px_rgba(0,245,255,0.15)] border border-white/10 group">
            {details.poster_path ? (
              <img 
                src={getImageUrl(details.poster_path, 'w500')} 
                alt={title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium text-sm text-center p-4">
                No Poster Available
              </div>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={cn(
              "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
              mediaType === 'movie' ? "bg-[#00F5FF]/20 text-[#00F5FF]" : "bg-[#8B5CF6]/20 text-[#8B5CF6]"
            )}>
              {mediaType === 'movie' ? 'Movie' : 'Series'}
            </span>
            
            {releaseYear && (
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400" /> {releaseYear}
              </span>
            )}
            
            {runtime && (
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" /> {runtime}m
              </span>
            )}
            
            {details.vote_average > 0 && (
              <span className="flex items-center gap-1 font-bold text-[#00F5FF]">
                <Star className="w-4 h-4 fill-current" /> 
                {details.vote_average.toFixed(1)}
              </span>
            )}
          </div>

          {/* Title & Tagline */}
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2 leading-tight">
              {title}
            </h2>
            {details.tagline && (
              <p className="text-lg text-slate-400 italic font-medium">"{details.tagline}"</p>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {details.genres?.map(g => (
              <span key={g.id} className="text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                {g.name}
              </span>
            ))}
          </div>

          {/* Overview */}
          <div className="text-slate-300 text-base md:text-lg leading-relaxed max-w-4xl">
            <p className={cn(!expanded && "line-clamp-4")}>
              {details.overview || "No overview available."}
            </p>
            {details.overview && details.overview.length > 200 && (
              <button 
                onClick={() => setExpanded(!expanded)}
                className="text-[#00F5FF] font-semibold hover:underline mt-2 text-sm"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Actions (Mobile Friendly) */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onWatchlistClick}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 border",
                isInWatchlist
                  ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  : "bg-gradient-to-r from-[#00F5FF]/10 to-[#8B5CF6]/10 border-[#00F5FF]/30 text-[#00F5FF] hover:border-[#00F5FF] hover:shadow-[0_0_15px_rgba(0,245,255,0.3)]"
              )}
            >
              {isInWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              <span>{isInWatchlist ? 'Added to List' : 'Add to List'}</span>
            </button>
            
            <button
              onClick={onShareClick}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              <Share2 className="w-5 h-5 text-slate-400" />
              Share
            </button>
          </div>

          {/* Cast Row */}
          {cast && cast.length > 0 && (
            <div className="pt-6 border-t border-white/5">
              <h3 className="text-lg font-bold text-white mb-4">Top Cast</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {cast.slice(0, 10).map(person => (
                  <div key={person.id} className="flex flex-col items-center gap-2 w-24 flex-shrink-0 snap-start">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-800 border border-white/10 shadow-md">
                      {person.profile_path ? (
                        <img 
                          src={getImageUrl(person.profile_path, 'w500')} 
                          alt={person.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xl">
                          {person.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-white leading-tight line-clamp-1">{person.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight line-clamp-2 mt-0.5">{person.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
