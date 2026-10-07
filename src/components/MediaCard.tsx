import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Media } from '../types';
import { getImageUrl } from '../services/tmdbApi';
import { Star, Play } from 'lucide-react';
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
  enableHoverScale = false
}) => {
  const navigate = useNavigate();
  const title = item.title || item.name || item.original_title;
  const imagePath = variant === 'portrait' ? item.poster_path : item.backdrop_path || item.poster_path;
  const mediaType = item.media_type || ((item as any).first_air_date ? 'tv' : 'movie');
  const year = (item.release_date || (item as any).first_air_date || '').split('-')[0] || '';
  const vote = item.vote_average ? item.vote_average.toFixed(1) : '';

  if (!imagePath) return null;

  const isPortrait = variant === 'portrait';

  return (
    <div 
      className={cn(
        "group cursor-pointer shrink-0 snap-start flex flex-col gap-2 transition-all duration-300 ease-out transform-gpu",
        isPortrait 
          ? 'w-[140px] sm:w-[160px] md:w-[190px] lg:w-[210px]' 
          : 'w-[240px] sm:w-[280px] md:w-[300px] lg:w-[330px]',
        enableHoverScale && "hover:scale-[1.04] sm:hover:scale-105 hover:-translate-y-1.5 hover:z-20 relative",
        className
      )}
      onClick={() => onClick(item)}
    >
      <div className={cn(
        "relative overflow-hidden rounded-xl border border-white/5 transition-all duration-300 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_20px_rgba(0,245,255,0.25)] bg-[#0A1428]",
        isPortrait ? 'aspect-[2/3]' : 'aspect-video'
      )}>
        
        {rank && (
          <div className="absolute top-0 left-0 z-20 w-[34px] pt-1 pb-2 bg-gradient-to-b from-cyan-400 to-violet-600 ribbon-clip flex flex-col items-center justify-start shadow-lg">
            <span className="text-[8px] font-bold text-white uppercase tracking-tighter leading-none mt-1">Top</span>
            <span className="text-sm font-black text-white leading-none mt-0.5">{rank < 10 ? `0${rank}` : rank}</span>
          </div>
        )}

        <img
          src={getImageUrl(imagePath, isPortrait ? 'w500' : 'w780')}
          alt={title || 'Media poster'}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 group-hover:brightness-110"
          loading="lazy"
        />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
          <div className="w-10 h-10 bg-cyan-500/80 backdrop-blur-sm border border-cyan-400 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] transform group-hover:scale-110 transition-transform duration-200">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
            <div className="h-full bg-cyan-400" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="flex flex-col px-0.5">
        <h4 className="text-white text-sm font-medium truncate group-hover:text-cyan-300 transition-colors duration-200">{title}</h4>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
          {vote && (
            <span className="flex items-center font-medium text-slate-300">
              <Star className="w-3 h-3 text-cyan-400 fill-current mr-0.5" />
              {vote}
            </span>
          )}
          {vote && year && <span>&middot;</span>}
          {year && <span>{year}</span>}
          {year && <span>&middot;</span>}
          <span className="capitalize">{mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
        </div>
      </div>
    </div>
  );
};
