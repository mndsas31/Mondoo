import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Media } from '../types';
import { getImageUrl } from '../services/tmdbApi';
import { Star, Play, Film, Tv } from 'lucide-react';
import { cn } from '../utils/cn';

interface MediaCardProps {
  item: Media;
  variant?: 'portrait' | 'landscape';
  rank?: number;
  progress?: number;
  onClick: (item: Media) => void;
  className?: string;
  enableHoverScale?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({ 
  item, 
  variant = 'portrait', 
  rank, 
  progress, 
  onClick,
  className,
  enableHoverScale = true
}) => {
  const [imageError, setImageError] = useState(false);
  const title = item.title || item.name || item.original_title || 'Untitled';
  const imagePath = variant === 'portrait' ? item.poster_path : item.backdrop_path || item.poster_path;
  const mediaType = item.media_type || ((item as any).first_air_date ? 'tv' : 'movie');
  const year = (item.release_date || (item as any).first_air_date || '').split('-')[0] || '';
  const vote = item.vote_average ? item.vote_average.toFixed(1) : '';

  const isPortrait = variant === 'portrait';

  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "group cursor-pointer shrink-0 snap-start flex flex-col gap-2.5 select-none",
        isPortrait 
          ? 'w-[140px] sm:w-[160px] md:w-[190px] lg:w-[210px]' 
          : 'w-[240px] sm:w-[280px] md:w-[300px] lg:w-[330px]',
        className
      )}
      onClick={() => onClick(item)}
    >
      <div className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 transition-colors duration-300 group-hover:border-cyan-400/50 group-hover:shadow-[0_10px_30px_rgba(0,245,255,0.2)] bg-[#070D18]",
        isPortrait ? 'aspect-[2/3]' : 'aspect-video'
      )}>
        
        {rank && (
          <div className="absolute top-0 left-0 z-20 w-[34px] pt-1 pb-2 bg-gradient-to-b from-cyan-400 to-violet-600 ribbon-clip flex flex-col items-center justify-start shadow-lg">
            <span className="text-[8px] font-bold text-white uppercase tracking-tighter leading-none mt-1">Top</span>
            <span className="text-sm font-black text-white leading-none mt-0.5">{rank < 10 ? `0${rank}` : rank}</span>
          </div>
        )}

        {imagePath && !imageError ? (
          <img
            src={getImageUrl(imagePath, isPortrait ? 'w500' : 'w780')}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 group-hover:brightness-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
            {mediaType === 'tv' ? <Tv className="w-8 h-8 text-cyan-400/60 mb-2" /> : <Film className="w-8 h-8 text-cyan-400/60 mb-2" />}
            <span className="text-xs font-semibold text-slate-300 line-clamp-2">{title}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-11 h-11 bg-cyan-500 text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)] transform scale-90 group-hover:scale-105 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-sky-300 shadow-[0_0_8px_#22d3ee]" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="flex flex-col px-0.5 min-w-0">
        <h4 className="text-white text-xs sm:text-sm font-semibold truncate group-hover:text-cyan-300 transition-colors duration-200">
          {title}
        </h4>
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 mt-0.5">
          {vote && (
            <span className="flex items-center font-semibold text-amber-400 tabular-nums">
              <Star className="w-3 h-3 fill-current mr-0.5" />
              {vote}
            </span>
          )}
          {vote && (year || mediaType) && <span className="text-slate-600" aria-hidden="true">·</span>}
          {year && <span className="text-slate-400 tabular-nums">{year}</span>}
          {year && mediaType && <span className="text-slate-600" aria-hidden="true">·</span>}
          <span className="text-slate-400 capitalize">{mediaType === 'tv' ? 'Series' : 'Movie'}</span>
        </div>
      </div>
    </motion.div>
  );
};
