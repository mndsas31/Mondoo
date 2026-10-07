import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [movies, setMovies] = useState<Record<string, Media[]>>({});

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
        const [
          trending, popularMovies, topRated, popularTV, upcoming,
          action, scifi, horror, drama, animation
        ] = await Promise.all([
          api.getTrending('all', 'week'),
          api.getPopularMovies(),
          api.getTopRatedMovies(),
          api.getPopularTV(),
          api.getUpcomingMovies(),
          api.getMoviesByGenre(GENRES.ACTION),
          api.getMoviesByGenre(GENRES.SCIFI),
          api.getMoviesByGenre(GENRES.HORROR),
          api.getMoviesByGenre(GENRES.DRAMA),
          api.getMoviesByGenre(GENRES.ANIMATION),
        ]);

        setMovies({
          trending: trending.data.results, popularMovies: popularMovies.data.results,
          topRated: topRated.data.results, popularTV: popularTV.data.results, upcoming: upcoming.data.results,
          action: action.data.results, scifi: scifi.data.results, horror: horror.data.results,
          drama: drama.data.results, animation: animation.data.results,
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
    <div className="pb-20">
      {partyEndedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0A1428]/95 border border-cyan-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-[90%]">
          <Info className="w-5 h-5 text-cyan-400 shrink-0" />
          <p className="text-xs sm:text-sm font-medium flex-1">{partyEndedToast}</p>
          <button 
            onClick={() => setPartyEndedToast(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Hero onOpenModal={setSelectedMovie} />
      
      <div className="mt-[-150px] relative z-20 space-y-16 lg:space-y-20">
        {continueWatchingItems.length > 0 && (
          <ContinueWatchingRow 
            items={continueWatchingItems} 
            onOpenModal={setSelectedMovie}
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

        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : (
          <>
            <Top10Row title="Top 10 in MondoFlix" items={movies.popularMovies} onOpenModal={setSelectedMovie} />
            <Row title="Trending Now" items={movies.trending} variant="landscape" showTabs tabs={['Movies', 'Series']} activeTab="Movies" onTabChange={() => {}} onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Trending Now', '/trending/all/week', 'all')} />
            <ComingSoonRow items={movies.upcoming || []} onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Coming Soon - Upcoming Releases', '/movie/upcoming', 'movie')} />
            
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

            <Row title="Sci-Fi & Fantasy" items={movies.scifi} onOpenModal={setSelectedMovie} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.SCIFI, name: 'Sci-Fi & Fantasy' } })} />
            <Row title="Adrenaline-Pumping Action" items={movies.action} onOpenModal={setSelectedMovie} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.ACTION, name: 'Action Movies' } })} />
            <Row title="Popular TV Shows" items={movies.popularTV} onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Popular TV Shows', '/tv/popular', 'tv')} />
            <Row title="Critically Acclaimed Drama" items={movies.drama} onOpenModal={setSelectedMovie} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.DRAMA, name: 'Drama Movies' } })} />
            <Row title="Terrifying Horror" items={movies.horror} onOpenModal={setSelectedMovie} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.HORROR, name: 'Horror' } })} />
            <Row title="Animated Masterpieces" items={movies.animation} onOpenModal={setSelectedMovie} onExploreAll={() => setGenreModal({ isOpen: true, genre: { id: GENRES.ANIMATION, name: 'Animated Masterpieces' } })} />
            <Row title="Top Rated Classics" items={movies.topRated} onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Top Rated Classics', '/movie/top_rated', 'movie')} />
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
    </div>
  );
};
