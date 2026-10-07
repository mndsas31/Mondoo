import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/tmdbApi';
import { Media } from '../types';
import { MovieCard } from '../components/MovieCard';
import { Modal } from '../components/Modal';

export const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Media | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const response = await api.search(query);
        // Filter out people and items without images
        const filtered = response.data.results.filter(
          (item) => item.media_type !== 'person' && (item.poster_path || item.backdrop_path)
        );
        setResults(filtered);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query]);

  return (
    <div className="pt-28 px-4 md:px-12 lg:px-20 min-h-screen bg-[#020617] pb-20">
      <h2 className="text-white text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3">
        Search Results for <span className="text-cyan-400">"{query}"</span>
      </h2>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-8 md:gap-10">
          {results.map((item) => (
            <div key={item.id} className="flex justify-center">
               <MovieCard item={item} onOpenModal={setSelectedMovie} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
          <div className="text-6xl">🔍</div>
          <p className="text-xl font-medium">No results found for "{query}"</p>
          <p className="text-sm">Try checking for typos or using different keywords.</p>
        </div>
      )}

      {selectedMovie && (
        <Modal item={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
};
