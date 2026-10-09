import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getImageUrl } from '../services/tmdbApi';
import { Media } from '../types';
import { Play, Info, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeroProps {
  onOpenModal: (item: Media) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenModal }) => {
  const [movies, setMovies] = useState<Media[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await api.getTrending('all', 'week');
        const results = response.data.results.filter((m: Media) => m.backdrop_path); // Only items with backdrops
        setMovies(results);
        setCurrentIndex(Math.floor(Math.random() * results.length));
      } catch (error) {
        console.error("Failed to fetch trending for hero:", error);
      }
    };
    fetchTrending();
  }, []);

  const handleSurpriseMe = () => {
    if (movies.length > 1) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * movies.length);
      } while (nextIndex === currentIndex);
      setCurrentIndex(nextIndex);
    }
  };

  if (movies.length === 0) {
    return <div className="w-full h-[85vh] lg:h-[95vh] bg-[#020617] animate-pulse"></div>;
  }

  const movie = movies[currentIndex];
  const title = movie.title || movie.name || movie.original_title;
  const mediaType = movie.media_type || ((movie as any).first_air_date ? 'tv' : 'movie');

  return (
    <div className="relative w-full h-[85vh] lg:h-[95vh] text-white overflow-hidden bg-[#020617]">
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute w-full h-full"
        >
          <img
            src={getImageUrl(movie.backdrop_path || movie.poster_path || '', 'original')}
            alt={title}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent"></div>
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute top-[30%] lg:top-[35%] w-full px-4 md:px-12 lg:px-20 max-w-3xl flex flex-col items-start gap-6 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${movie.id}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Clean Unboxed Metadata */}
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 flex-wrap">
              <span className="text-cyan-400 font-semibold uppercase tracking-wider">
                {mediaType === 'movie' ? 'Featured Film' : 'Featured Series'}
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                {Math.round((movie.vote_average || 0) * 10)}% Match
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-400">
                {movie.release_date?.substring(0,4) || (movie as any).first_air_date?.substring(0,4) || '2024'}
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-400 font-semibold tracking-wider text-[11px] uppercase">
                Ultra HD
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-2xl leading-[0.95] text-balance">
              {title}
            </h1>
            
            <p className="text-slate-300 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed drop-shadow-md line-clamp-3">
              {movie.overview}
            </p>

            <div className="flex items-center gap-3.5 mt-2 flex-wrap">
              <motion.button 
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => {
                  const activePartyCode = sessionStorage.getItem('active_party_code');
                  const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
                  navigate(`/watch/${mediaType}/${movie.id}${mediaType === 'tv' ? '/season/1/episode/1' : ''}${partyQuery}`);
                }}
                className="group flex items-center gap-2.5 bg-white text-black px-7 py-3.5 rounded-full hover:bg-cyan-50 transition-all font-bold text-base shadow-[0_0_25px_rgba(255,255,255,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] cursor-pointer"
              >
                <Play className="w-5 h-5 fill-black group-hover:text-cyan-600 transition-colors" />
                <span>Play Now</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => onOpenModal(movie)}
                className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-xl text-white px-7 py-3.5 rounded-full hover:bg-slate-800 transition-all font-semibold text-base border border-white/15 hover:border-white/30 cursor-pointer shadow-lg"
              >
                <Info className="w-5 h-5 text-slate-300" />
                <span>Details</span>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={handleSurpriseMe}
                className="flex items-center gap-2 bg-violet-950/60 backdrop-blur-xl text-violet-300 px-5 py-3.5 rounded-full hover:bg-violet-900/60 transition-all font-medium text-sm border border-violet-500/30 hover:border-violet-400 cursor-pointer shadow-lg"
                title="Shuffle Featured Title"
              >
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>Shuffle</span>
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
