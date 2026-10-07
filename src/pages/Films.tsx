import React, { useEffect, useState } from 'react';
import { api, GENRES } from '../services/tmdbApi';
import { Media } from '../types';
import { Hero } from '../components/Hero';
import { Row } from '../components/Row';
import { SkeletonRow } from '../components/SkeletonRow';
import { Modal } from '../components/Modal';
import { ExploreModal } from '../components/ExploreModal';

export const Films: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Media | null>(null);
  const [exploreModal, setExploreModal] = useState<{isOpen: boolean, title: string, endpoint: string}>({ isOpen: false, title: '', endpoint: '' });
  
  const [movies, setMovies] = useState<Record<string, Media[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trending, popular, topRated, upcoming, action] = await Promise.all([
          api.getTrending('movie', 'week'),
          api.getPopularMovies(),
          api.getTopRatedMovies(),
          api.getUpcomingMovies(),
          api.getMoviesByGenre(GENRES.ACTION)
        ]);
        setMovies({
          trending: trending.data.results, popular: popular.data.results,
          topRated: topRated.data.results, upcoming: upcoming.data.results, action: action.data.results
        });
      } catch (error) {
        console.error('Error fetching films data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openExplore = (title: string, endpoint: string) => setExploreModal({ isOpen: true, title, endpoint });

  return (
    <div className="pb-20">
      <Hero onOpenModal={setSelectedMovie} />
      <div className="mt-[-150px] relative z-20 space-y-16 lg:space-y-20">
        {loading ? (
          <><SkeletonRow /><SkeletonRow /></>
        ) : (
          <>
            <Row title="Cinematic Hits" items={movies.popular} variant="portrait" onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Cinematic Hits', '/movie/popular')} />
            <Row title="Trending Movies" items={movies.trending} variant="landscape" onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Trending Movies', '/trending/movie/week')} />
            <Row title="Coming Soon to Theaters" items={movies.upcoming} variant="landscape" onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Upcoming Releases', '/movie/upcoming')} />
            <Row title="Blockbuster Action" items={movies.action} variant="portrait" onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Action Movies', `/discover/movie?with_genres=${GENRES.ACTION}`)} />
            <Row title="Oscar-Worthy Masterpieces" items={movies.topRated} variant="portrait" onOpenModal={setSelectedMovie} onExploreAll={() => openExplore('Top Rated Classics', '/movie/top_rated')} />
          </>
        )}
      </div>

      {selectedMovie && <Modal item={selectedMovie} onClose={() => setSelectedMovie(null)} />}
      <ExploreModal {...exploreModal} type="movie" onClose={() => setExploreModal(prev => ({...prev, isOpen: false}))} />
    </div>
  );
};
