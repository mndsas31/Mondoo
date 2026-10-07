import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Media } from '../types';
import { getImageUrl } from '../services/tmdbApi';
import { Play, Plus, Check } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';

interface MovieCardProps {
  item: Media;
  onOpenModal: (item: Media) => void;
  isLargeRow?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({ item, onOpenModal, isLargeRow }) => {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const navigate = useNavigate();
  const inList = isInWatchlist(item.id);

  const title = item.title || item.name || item.original_title;
  const imagePath = isLargeRow ? item.poster_path : item.backdrop_path || item.poster_path;
  const mediaType = item.media_type || ((item as any).first_air_date ? 'tv' : 'movie');
  
  if (!imagePath) return null;

  return (
    <div 
      className={`relative flex-shrink-0 snap-center group cursor-pointer transition-all duration-300 transform sm:hover:scale-105 sm:hover:z-50 ${isLargeRow ? 'w-[200px] sm:w-[280px] lg:w-[320px]' : 'w-[280px] sm:w-[380px] lg:w-[450px]'}`}
      onClick={() => onOpenModal(item)}
    >
      <img
        src={getImageUrl(imagePath, 'w780')}
        alt={title}
        className={`w-full object-cover rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] ${isLargeRow ? 'h-[300px] sm:h-[420px] lg:h-[480px]' : 'h-[158px] sm:h-[214px] lg:h-[253px]'}`}
        loading="lazy"
      />
      
      {/* Hover Info Card (Visible on desktop hover) */}
      <div className="absolute inset-0 bg-slate-950/80 rounded-xl opacity-0 sm:group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5 md:p-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] pointer-events-none sm:pointer-events-auto overflow-hidden">
        
        {/* Play button overlay that grows */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 sm:group-hover:opacity-100 transition-opacity delay-100 mb-10">
          <button 
            className="w-12 h-12 bg-cyan-500/20 backdrop-blur-sm border border-cyan-400 rounded-full flex items-center justify-center hover:bg-cyan-500 hover:scale-110 transition-all text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            onClick={(e) => { 
              e.stopPropagation(); 
              const activePartyCode = sessionStorage.getItem('active_party_code');
              const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
              const tvQuery = mediaType === 'tv' ? '/season/1/episode/1' : '';
              navigate(`/watch/${mediaType}/${item.id}${tvQuery}${partyQuery}`); 
            }}
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        </div>

        <div className="z-10 translate-y-6 group-hover:translate-y-0 transition-transform duration-300">
          <h4 className="text-white font-bold text-base md:text-lg lg:text-xl truncate mb-3 text-shadow-md">{title}</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button 
                className="w-10 h-10 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center hover:border-cyan-400 hover:text-cyan-400 transition-colors text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  inList ? removeFromWatchlist(item.id) : addToWatchlist(item);
                }}
              >
                {inList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="flex items-center gap-3 text-sm md:text-base font-semibold">
              <span className="text-cyan-400">{Math.round((item.vote_average || 0) * 10)}%</span>
              <span className="text-slate-300 border border-slate-600 px-2 py-0.5 rounded text-xs">HD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
