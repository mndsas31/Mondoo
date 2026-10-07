import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Trash2, Film, Tv, TrendingUp, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDebounce } from 'use-debounce';
import { api, getImageUrl } from '../services/tmdbApi';
import { Media } from '../types';
import { Modal } from './Modal';
import { MediaCard } from './MediaCard';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { cn } from '../utils/cn';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 500);
  const [results, setResults] = useState<Media[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Media[]>([]);
  const [trending, setTrending] = useState<Media[]>([]);
  const [selectedItem, setSelectedItem] = useState<Media | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      
      const local = JSON.parse(localStorage.getItem('mondoflix_recent_searches') || '[]');
      loadServerRecentSearches(local);
      
      api.getTrending().then(res => setTrending(res.data.results.slice(0, 12))).catch(console.error);
    } else {
      setQuery('');
      setResults([]);
      setSelectedItem(null);
    }
  }, [isOpen, user, token]);

  const loadServerRecentSearches = async (local: Media[]) => {
    if (user && token) {
      try {
        const serverData = await apiFetch('/search-history');
        setRecentSearches(serverData.length > 0 ? serverData : local);
        return;
      } catch (e) {
        console.error("Failed to load server recent searches", e);
      }
    }
    setRecentSearches(local);
  };

  const saveRecentSearch = async (item: Media) => {
    const updated = [item, ...recentSearches.filter(i => i.id !== item.id)].slice(0, 8);
    setRecentSearches(updated);
    
    if (user && token) {
      try {
        await apiFetch('/search-history', {
          method: 'POST',
          body: JSON.stringify({ item })
        });
      } catch (e) {}
    } else {
      localStorage.setItem('mondoflix_recent_searches', JSON.stringify(updated));
    }
  };

  const removeRecentSearch = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const updated = recentSearches.filter(i => i.id !== id);
    setRecentSearches(updated);
    
    if (user && token) {
      try {
        await apiFetch(`/search-history/${id}`, { method: 'DELETE' });
      } catch (e) {}
    } else {
      localStorage.setItem('mondoflix_recent_searches', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    if (debouncedQuery.trim().length > 2) {
      setIsSearching(true);
      api.search(debouncedQuery)
        .then(res => {
          setResults(res.data.results.filter((r: any) => r.media_type !== 'person'));
        })
        .catch(console.error)
        .finally(() => setIsSearching(false));
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const handleResultClick = (item: Media) => {
    saveRecentSearch(item);
    setSelectedItem(item);
  };

  const MediaGrid = ({ items }: { items: Media[] }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {items.map(item => (
        <MediaCard 
          key={item.id} 
          item={item} 
          variant="portrait" 
          className="w-full"
          enableHoverScale
          onClick={() => handleResultClick(item)} 
        />
      ))}
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl"
          onClick={onClose}
        />
        
        {/* Main Search Panel */}
        {!selectedItem && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[90vw] h-[85vh] bg-[#0A1428]/95 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,245,255,0.1)] flex flex-col z-10"
          >
            {/* Top Search Bar */}
            <div className="flex items-center px-6 py-6 border-b border-white/5 bg-slate-900/50">
              <Search className="w-8 h-8 text-cyan-400 mr-4" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search for movies, TV shows, genres..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-2xl sm:text-4xl font-black text-white outline-none placeholder-slate-600 tracking-tight"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
              )}
              <div className="h-10 w-px bg-white/10 mx-4"></div>
              <button 
                onClick={onClose}
                className="p-2 bg-slate-800/50 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-hide">
              {query.trim().length > 0 ? (
                // Live Results
                <div className="animate-in fade-in duration-300">
                  {isSearching ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
                    </div>
                  ) : results.length > 0 ? (
                    <div>
                      <h2 className="text-xl font-bold text-white mb-6">Top Results for "{query}"</h2>
                      <MediaGrid items={results} />
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 mt-20 text-lg">
                      No results found for "<span className="text-slate-300">{query}</span>"
                    </div>
                  )}
                </div>
              ) : (
                // Empty State: Recent & Trending
                <div className="animate-in fade-in duration-300 space-y-12">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <Clock className="w-5 h-5 text-violet-400" />
                        <h2 className="text-xl font-bold text-white">Recent Searches</h2>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                        {recentSearches.map(item => (
                          <div 
                            key={`recent-${item.id}`}
                            className="relative flex-shrink-0 w-64 bg-slate-900/80 rounded-xl overflow-hidden border border-white/5 flex cursor-pointer group hover:border-violet-500/50 snap-start"
                            onClick={() => handleResultClick(item)}
                          >
                            <img 
                              src={getImageUrl(item.poster_path, 'w500')} 
                              alt={item.title || item.name}
                              className="w-20 h-28 object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="p-3 flex flex-col justify-center flex-1">
                              <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight">
                                {item.title || item.name}
                              </h3>
                              <span className="text-xs text-slate-400 mt-1 capitalize">
                                {item.media_type || 'Movie'}
                              </span>
                            </div>
                            <button 
                              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-black transition-all"
                              onClick={(e) => removeRecentSearch(e, item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trending.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-xl font-bold text-white">Trending Now</h2>
                      </div>
                      <MediaGrid items={trending} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Selected Movie Modal */}
        {selectedItem && (
          <Modal 
            item={selectedItem} 
            onClose={() => {
              setSelectedItem(null);
              onClose();
            }} 
          />
        )}
      </div>
    </AnimatePresence>
  );
};
