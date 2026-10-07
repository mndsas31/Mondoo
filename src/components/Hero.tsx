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
            <div className="flex items-center gap-3 text-cyan-400 font-semibold tracking-wider text-sm md:text-base">
              <span className="uppercase px-2 py-1 bg-cyan-500/20 rounded backdrop-blur-sm border border-cyan-500/30">
                {mediaType === 'movie' ? 'Featured Movie' : 'Featured Series'}
              </span>
              <span className="text-gray-300">
                {Math.round((movie.vote_average || 0) * 10)}% Match
              </span>
              <span className="text-gray-400">
                {movie.release_date?.substring(0,4) || (movie as any).first_air_date?.substring(0,4)}
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-2xl leading-none">
              {title}
            </h1>
            
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl leading-relaxed drop-shadow-md line-clamp-3">
              {movie.overview}
            </p>

            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <button 
                onClick={() => {
                  const activePartyCode = sessionStorage.getItem('active_party_code');
                  const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
                  navigate(`/watch/${mediaType}/${movie.id}${mediaType === 'tv' ? '/season/1/episode/1' : ''}${partyQuery}`);
                }}
                className="group flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full hover:bg-cyan-50 transition-all font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-105"
              >
                <Play className="w-6 h-6 fill-black group-hover:text-cyan-600 transition-colors" />
                Play Now
              </button>
              
              <button 
                onClick={() => onOpenModal(movie)}
                className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md text-white px-8 py-4 rounded-full hover:bg-slate-700/80 transition-all font-bold text-lg border border-white/10 hover:border-white/30"
              >
                <Info className="w-6 h-6" />
                More Info
              </button>

              <button 
                onClick={handleSurpriseMe}
                className="flex items-center gap-2 bg-violet-600/20 backdrop-blur-md text-violet-300 px-6 py-4 rounded-full hover:bg-violet-600/40 transition-all font-bold text-lg border border-violet-500/30 hover:border-violet-400 hover:text-violet-200"
              >
                <Sparkles className="w-5 h-5" />
                Surprise Me
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
