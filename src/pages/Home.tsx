import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { api, GENRES } from '../services/tmdbApi';
import { Media } from '../types';
import { Hero } from '../components/Hero';
import { Row } from '../components/Row';
import { SkeletonRow } from '../components/SkeletonRow';
import { Modal } from '../components/Modal';
import { Top10Row } from '../components/Top10Row';
import { ComingSoonRow } from '../components/ComingSoonRow';
import { GenreCard } from '../components/GenreCard';
import { useContinueWatching } from '../hooks/useContinueWatching';
import { ContinueWatchingRow } from '../components/ContinueWatchingRow';
import { useRecentlyWatched } from '../hooks/useRecentlyWatched';
import { RecentlyWatchedRow } from '../components/RecentlyWatchedRow';
import { TrendingNowCarousel } from '../components/TrendingNowCarousel';
import { ExploreModal } from '../components/ExploreModal';
import { GenreModal } from '../components/GenreModal';
import { Info, X } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Media | null>(null);
  const [partyEndedToast, setPartyEndedToast] = useState<string | null>(() => {
    return (location.state as any)?.partyEnded ? ((location.state as any)?.message || 'Watch party ended. Welcome back to Home.') : null;
  });
  
  const [exploreModal, setExploreModal] = useState<{isOpen: boolean, title: string, endpoint: string, type: 'all'|'movie'|'tv'}>({ isOpen: false, title: '', endpoint: '', type: 'all' });
  const [genreModal, setGenreModal] = useState<{isOpen: boolean, genre: {id: number, name: string} | null}>({ isOpen: false, genre: null });

  const { items: continueWatchingItems, removeItem, clearAll } = useContinueWatching();
  const { 
    items: recentlyWatchedItems, 
    addRecentlyWatched, 
    removeRecentlyWatched, 
    clearRecentlyWatched 
  } = useRecentlyWatched();
  
  const [movies, setMovies] = useState<Record<string, Media[]>>({
    trending: [],
    popularMovies: [],
    topRated: [],
    popularTV: [],
    upcoming: [],
    action: [],
    scifi: [],
    horror: [],
    drama: [],
    animation: []
  });

  const handleOpenMedia = (media: Media) => {
    if (media) {
      addRecentlyWatched(media);
      setSelectedMovie(media);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const party = params.get('party');
    if (party) {
      sessionStorage.setItem('active_party_code', party);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchSafe = async (promise: Promise<any>) => {
          try {
            const res = await promise;
            return res.data?.results || [];
          } catch (err) {
            console.error('Graceful isolation: Failed to fetch row category from TMDB API:', err);
            return [];
          }
        };

        const [
          trending, popularMovies, topRated, popularTV, upcoming,
          action, scifi, horror, drama, animation
        ] = await Promise.all([
          fetchSafe(api.getTrending('all', 'week')),
          fetchSafe(api.getPopularMovies()),
          fetchSafe(api.getTopRatedMovies()),
          fetchSafe(api.getPopularTV()),
          fetchSafe(api.getUpcomingMovies()),
          fetchSafe(api.getMoviesByGenre(GENRES.ACTION)),
          fetchSafe(api.getMoviesByGenre(GENRES.SCIFI)),
          fetchSafe(api.getMoviesByGenre(GENRES.HORROR)),
          fetchSafe(api.getMoviesByGenre(GENRES.DRAMA)),
          fetchSafe(api.getMoviesByGenre(GENRES.ANIMATION)),
        ]);

        setMovies({
          trending, popularMovies, topRated, popularTV, upcoming,
          action, scifi, horror, drama, animation
        });
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const genresList = [
    { id: GENRES.THRILLER, title: 'Thriller', color: 'from-emerald-900 to-emerald-600' },
    { id: GENRES.ACTION, title: 'Action', color: 'from-red-900 to-red-600' },
    { id: GENRES.SCIFI, title: 'Sci-Fi', color: 'from-cyan-900 to-cyan-600' },
    { id: GENRES.COMEDY, title: 'Comedy', color: 'from-amber-600 to-orange-500' },
    { id: GENRES.HORROR, title: 'Horror', color: 'from-slate-900 to-slate-700' },
    { id: GENRES.DRAMA, title: 'Drama', color: 'from-violet-900 to-violet-600' },
  ];

  const openExplore = (title: string, endpoint: string, type: 'all'|'movie'|'tv' = 'all') => {
    setExploreModal({ isOpen: true, title, endpoint, type });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.4 }}
      className="pb-20"
    >
      <AnimatePresence>
        {partyEndedToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#070D18]/95 border border-cyan-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-2xl max-w-md w-[90%]"
          >
            <Info className="w-5 h-5 text-cyan-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium flex-1">{partyEndedToast}</p>
            <button 
              onClick={() => setPartyEndedToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Hero onOpenModal={handleOpenMedia} />
      
      <div className="mt-[-150px] relative z-20 space-y-16 lg:space-y-20">
        {continueWatchingItems.length > 0 && (
          <ContinueWatchingRow 
            items={continueWatchingItems} 
            onOpenModal={handleOpenMedia}
            onRemoveItem={removeItem}
            onClearAll={clearAll}
            onStartWatchParty={(item) => {
              const mType = item.media_type || item.media?.media_type || (item.season ? 'tv' : 'movie');
              let url = `/watch/${mType}/${item.media.id}`;
              if (mType === 'tv' && item.season && item.episode) {
                url += `/season/${item.season}/episode/${item.episode}`;
              }
              navigate(url);
            }}
          />
        )}

        {recentlyWatchedItems.length > 0 && (
          <RecentlyWatchedRow 
            items={recentlyWatchedItems}
            onOpenModal={handleOpenMedia}
            onRemoveItem={removeRecentlyWatched}
            onClearAll={clearRecentlyWatched}
          />
        )}

        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : (
          <>
            <Top10Row title="Top 10 in MondoFlix" items={movies.popularMovies} onOpenModal={handleOpenMedia} />
            <TrendingNowCarousel onOpenModal={handleOpenMedia} />
            <ComingSoonRow items={movies.upcoming || []} onOpenModal={handleOpenMedia} onExploreAll={() => openExplore('Coming Soon - Upcoming Releases', '/movie/upcoming', 'movie')} />
            
            <div className="px-4 md:px-10 mb-16 lg:mb-20">
              <h2 className="text-white text-xl md:text-2xl font-bold mb-6">Browse by Genre</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {genresList.map(genre => (
                  <GenreCard 
                    key={genre.id} 
                    id={genre.id} 
                    title={genre.title} 
                    color={genre.color} 
                    onClick={() => setGenreModal({ isOpen: true, genre: { id: genre.id, name: genre.title } })}
                  />
                ))}
              </div>
            </div>

            <Row title="Sci-Fi & Fantasy" items={movies.scifi} onOpenModal={handleOpenMedia} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.SCIFI, name: 'Sci-Fi & Fantasy' } })} />
            <Row title="Adrenaline-Pumping Action" items={movies.action} onOpenModal={handleOpenMedia} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.ACTION, name: 'Action Movies' } })} />
            <Row title="Popular TV Shows" items={movies.popularTV} onOpenModal={handleOpenMedia} onExploreAll={() => openExplore('Popular TV Shows', '/tv/popular', 'tv')} />
            <Row title="Critically Acclaimed Drama" items={movies.drama} onOpenModal={handleOpenMedia} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.DRAMA, name: 'Drama Movies' } })} />
            <Row title="Terrifying Horror" items={movies.horror} onOpenModal={handleOpenMedia} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.HORROR, name: 'Horror' } })} />
            <Row title="Animated Masterpieces" items={movies.animation} onOpenModal={handleOpenMedia} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.ANIMATION, name: 'Animated Masterpieces' } })} />
            <Row title="Top Rated Classics" items={movies.topRated} onOpenModal={handleOpenMedia} onExploreAll={() => openExplore('Top Rated Classics', '/movie/top_rated', 'movie')} />
          </>
        )}
      </div>

      {selectedMovie && <Modal item={selectedMovie} onClose={() => setSelectedMovie(null)} />}
      
      <ExploreModal {...exploreModal} onClose={() => setExploreModal(prev => ({...prev, isOpen: false}))} />
      
      <GenreModal 
        isOpen={genreModal.isOpen} 
        genre={genreModal.genre} 
        onClose={() => setGenreModal(prev => ({...prev, isOpen: false}))} 
        onSelect={(item) => {
          setGenreModal(prev => ({...prev, isOpen: false}));
          setSelectedMovie(item);
        }} 
      />
    </motion.div>
  );
};
