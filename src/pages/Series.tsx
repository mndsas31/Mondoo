import React, { useEffect, useState } from 'react';
import { api, GENRES, tmdbAxios } from '../services/tmdbApi';
import { Media } from '../types';
import { Hero } from '../components/Hero';
import { Row } from '../components/Row';
import { SkeletonRow } from '../components/SkeletonRow';
import { Modal } from '../components/Modal';
import { ExploreModal } from '../components/ExploreModal';

export const Series: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<Media | null>(null);
  const [exploreModal, setExploreModal] = useState<{isOpen: boolean, title: string, endpoint: string}>({ isOpen: false, title: '', endpoint: '' });
  
  const [series, setSeries] = useState<Record<string, Media[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trending, popular, topRated, airing] = await Promise.all([
          api.getTrending('tv', 'week'),
          api.getPopularTV(),
          tmdbAxios.get('/tv/top_rated'),
          tmdbAxios.get('/tv/on_the_air')
        ]);
        setSeries({
          trending: trending.data.results,
          popular: popular.data.results,
          topRated: topRated.data.results,
          airing: airing.data.results,
        });
      } catch (error) {
        console.error('Error fetching series data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openExplore = (title: string, endpoint: string) => setExploreModal({ isOpen: true, title, endpoint });

  return (
    <div className="pb-20">
      <Hero onOpenModal={setSelectedSeries} />
      <div className="mt-[-150px] relative z-20 space-y-16 lg:space-y-20">
        {loading ? (
          <><SkeletonRow /><SkeletonRow /></>
        ) : (
          <>
            <Row title="Trending Series" items={series.trending} variant="landscape" onOpenModal={setSelectedSeries} onExploreAll={() => openExplore('Trending Series', '/trending/tv/week')} />
            <Row title="Popular Right Now" items={series.popular} variant="portrait" onOpenModal={setSelectedSeries} onExploreAll={() => openExplore('Popular TV', '/tv/popular')} />
            <Row title="New Episodes This Week" items={series.airing} variant="landscape" onOpenModal={setSelectedSeries} onExploreAll={() => openExplore('Airing Now', '/tv/on_the_air')} />
            <Row title="All-Time Top Rated Series" items={series.topRated} variant="portrait" onOpenModal={setSelectedSeries} onExploreAll={() => openExplore('Top Rated Series', '/tv/top_rated')} />
          </>
        )}
      </div>

      {selectedSeries && <Modal item={selectedSeries} onClose={() => setSelectedSeries(null)} />}
      <ExploreModal {...exploreModal} type="tv" onClose={() => setExploreModal(prev => ({...prev, isOpen: false}))} />
    </div>
  );
};
