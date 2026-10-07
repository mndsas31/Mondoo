import React, { useEffect, useState } from 'react';
import { api, tmdbAxios } from '../services/tmdbApi';
import { Media } from '../types';
import { Row } from '../components/Row';
import { SkeletonRow } from '../components/SkeletonRow';
import { Modal } from '../components/Modal';
import { ExploreModal } from '../components/ExploreModal';

export const NewPopular: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Media | null>(null);
  const [exploreModal, setExploreModal] = useState<{isOpen: boolean, title: string, endpoint: string, type: 'all'|'movie'|'tv'}>({ isOpen: false, title: '', endpoint: '', type: 'all' });
  
  const [content, setContent] = useState<Record<string, Media[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trending, upcomingMovies, airingTV] = await Promise.all([
          api.getTrending('all', 'day'),
          api.getUpcomingMovies(),
          tmdbAxios.get('/tv/on_the_air')
        ]);
        setContent({
          trending: trending.data.results,
          upcoming: upcomingMovies.data.results,
          airing: airingTV.data.results,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openExplore = (title: string, endpoint: string, type: 'all'|'movie'|'tv' = 'all') => setExploreModal({ isOpen: true, title, endpoint, type });

  return (
    <div className="pt-24 pb-20 px-4 md:px-12 lg:px-20">
      <h1 className="text-3xl md:text-5xl font-black text-white mb-10 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
        New & Popular
      </h1>
      
      <div className="space-y-16 lg:space-y-20">
        {loading ? (
          <><SkeletonRow /><SkeletonRow /></>
        ) : (
          <>
            <Row title="Hot Right Now (Today)" items={content.trending} variant="landscape" onOpenModal={setSelectedItem} onExploreAll={() => openExplore('Hot Right Now', '/trending/all/day', 'all')} />
            <Row title="New Movies Dropping Soon" items={content.upcoming} variant="landscape" onOpenModal={setSelectedItem} onExploreAll={() => openExplore('Upcoming Movies', '/movie/upcoming', 'movie')} />
            <Row title="New TV Episodes This Week" items={content.airing} variant="landscape" onOpenModal={setSelectedItem} onExploreAll={() => openExplore('Airing Series', '/tv/on_the_air', 'tv')} />
          </>
        )}
      </div>

      {selectedItem && <Modal item={selectedItem} onClose={() => setSelectedItem(null)} />}
      <ExploreModal {...exploreModal} onClose={() => setExploreModal(prev => ({...prev, isOpen: false}))} />
    </div>
  );
};
