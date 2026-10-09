import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Media, MediaDetails } from '../types';
import { api, getImageUrl } from '../services/tmdbApi';
import { X, Play, Plus, Check, Star, Calendar, Clock } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useRecentlyWatched } from '../hooks/useRecentlyWatched';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  item: Media;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ item, onClose }) => {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { addRecentlyWatched } = useRecentlyWatched();
  const navigate = useNavigate();
  const inList = isInWatchlist(item.id);
  const mediaType = item.media_type || ((item as any).first_air_date ? 'tv' : 'movie');

  useEffect(() => {
    if (item) {
      addRecentlyWatched(item);
    }
  }, [item, addRecentlyWatched]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const targetType: 'movie' | 'tv' = mediaType === 'tv' ? 'tv' : 'movie';
        const response = await api.getDetails(targetType, item.id);
        setDetails(response.data);
      } catch (error) {
        console.error("Failed to fetch details:", error);
      }
    };
    fetchDetails();
  }, [item.id, mediaType]);

  const title = item.title || item.name || item.original_title;
  const trailer = details?.videos?.results?.find((vid) => vid.type === 'Trailer');

  // Format runtime
  const formatRuntime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 mt-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        ></motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="relative bg-[#070D18] w-full max-w-4xl max-h-[85vh] rounded-3xl overflow-y-auto overflow-x-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 scrollbar-hide z-10"
        >
          {/* Header Image */}
          <div className="relative h-[38vh] sm:h-[48vh] w-full bg-slate-950">
            <img 
              src={getImageUrl(item.backdrop_path || item.poster_path || '', 'original')} 
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070D18] via-[#070D18]/50 to-transparent"></div>
            
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors border border-white/15 cursor-pointer z-20 shadow-lg"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-3xl sm:text-5xl font-black text-white drop-shadow-xl mb-4 tracking-tight leading-tight">{title}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => {
                      const activePartyCode = sessionStorage.getItem('active_party_code');
                      const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
                      navigate(`/watch/${mediaType}/${item.id}${mediaType === 'tv' ? '/season/1/episode/1' : ''}${partyQuery}`);
                    }}
                    className="flex items-center gap-2 bg-white text-black px-7 py-3 rounded-xl hover:bg-cyan-50 transition-all font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Play Now</span>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => inList ? removeFromWatchlist(item.id) : addToWatchlist(item)}
                    className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/15 text-white px-5 py-3 rounded-xl hover:border-cyan-400 hover:text-cyan-300 transition-colors font-semibold cursor-pointer shadow-md"
                  >
                    {inList ? <Check className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5" />}
                    <span>{inList ? 'In My List' : 'Add to List'}</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column (Details) */}
              <div className="flex-[2] space-y-6">
                {/* Clean Unboxed Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-300">
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {Math.round((item.vote_average || 0) * 10)}% Match
                  </span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {item.release_date?.substring(0, 4) || (item as any).first_air_date?.substring(0, 4) || '2024'}
                  </span>
                  {details?.runtime && (
                    <>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatRuntime(details.runtime)}</span>
                    </>
                  )}
                  {details?.number_of_seasons && (
                    <>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span>{details.number_of_seasons} Season{details.number_of_seasons > 1 ? 's' : ''}</span>
                    </>
                  )}
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ultra HD</span>
                </div>

                <p className="text-slate-200 text-base sm:text-lg leading-relaxed">{item.overview}</p>

                {/* Cast */}
                {details?.credits?.cast && details.credits.cast.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-3">Top Cast</h3>
                    <div className="flex flex-wrap gap-2">
                      {details.credits.cast.slice(0, 6).map(person => (
                        <span key={person.id} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full text-sm border border-slate-700">
                          {person.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Metadata) */}
              <div className="flex-[1] space-y-6">
                {details?.genres && (
                  <div>
                    <h4 className="text-slate-400 text-sm font-semibold mb-2">Genres</h4>
                    <div className="flex flex-wrap gap-2">
                      {details.genres.map(g => (
                        <span key={g.id} className="text-cyan-400 text-sm hover:underline cursor-pointer">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {trailer && (
                  <div className="hidden md:block">
                    <h4 className="text-slate-400 text-sm font-semibold mb-3">Trailer</h4>
                    <div className="relative rounded-lg overflow-hidden group cursor-pointer border border-slate-700 shadow-lg">
                      <img 
                        src={`https://img.youtube.com/vi/${trailer.key}/maxresdefault.jpg`} 
                        alt="Trailer" 
                        className="w-full h-auto object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 text-white fill-white" />
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
