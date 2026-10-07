import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Media, MediaDetails } from '../types';
import { api, getImageUrl } from '../services/tmdbApi';
import { X, Play, Plus, Check, Star, Calendar, Clock } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  item: Media;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ item, onClose }) => {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const navigate = useNavigate();
  const inList = isInWatchlist(item.id);
  const mediaType = item.media_type || ((item as any).first_air_date ? 'tv' : 'movie');

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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-y-auto overflow-x-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700 scrollbar-hide z-10"
        >
          {/* Header Image */}
          <div className="relative h-[40vh] sm:h-[50vh] w-full">
            <img 
              src={getImageUrl(item.backdrop_path || item.poster_path || '', 'original')} 
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-slate-900/50 hover:bg-slate-800 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors border border-white/10 hover:border-white/30 z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-3xl sm:text-5xl font-black text-white drop-shadow-lg mb-4">{title}</h2>
                <div className="flex flex-wrap items-center gap-4">
                  <button 
                    onClick={() => {
                      const activePartyCode = sessionStorage.getItem('active_party_code');
                      const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
                      navigate(`/watch/${mediaType}/${item.id}${mediaType === 'tv' ? '/season/1/episode/1' : ''}${partyQuery}`);
                    }}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg hover:bg-cyan-50 hover:text-cyan-600 transition-all font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Play
                  </button>
                  <button 
                    onClick={() => inList ? removeFromWatchlist(item.id) : addToWatchlist(item)}
                    className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md border border-slate-600 text-white px-6 py-3 rounded-lg hover:border-cyan-400 hover:text-cyan-400 transition-colors font-semibold"
                  >
                    {inList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {inList ? 'Added' : 'My List'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column (Details) */}
              <div className="flex-[2] space-y-6">
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                  <span className="flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded">
                    <Star className="w-4 h-4 fill-current" />
                    {Math.round((item.vote_average || 0) * 10)}% Match
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Calendar className="w-4 h-4" />
                    {item.release_date?.substring(0, 4) || (item as any).first_air_date?.substring(0, 4)}
                  </span>
                  {details?.runtime && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-4 h-4" />
                      {formatRuntime(details.runtime)}
                    </span>
                  )}
                  {details?.number_of_seasons && (
                    <span className="text-slate-300">
                      {details.number_of_seasons} Season{details.number_of_seasons > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="border border-slate-600 text-slate-400 px-1.5 py-0.5 rounded text-xs uppercase">HD</span>
                </div>

                <p className="text-slate-200 text-lg leading-relaxed">{item.overview}</p>

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
