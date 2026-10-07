import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search as SearchIcon, Film, Tv, Star, ChevronDown } from 'lucide-react';
import { tmdbAxios, getImageUrl } from '../services/tmdbApi';
import { Media } from '../types';
import { Modal } from './Modal';
import { MediaCard } from './MediaCard';
import { Logo } from './Logo';
import { cn } from '../utils/cn';

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  endpoint: string; // e.g., '/movie/popular' or '/discover/movie?with_genres=28'
  type?: 'all' | 'movie' | 'tv';
}

type FilterType = 'all' | 'movie' | 'tv';
type SortType = 'default' | 'rating' | 'year';

export const ExploreModal: React.FC<ExploreModalProps> = ({ isOpen, onClose, title, endpoint, type = 'all' }) => {
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>(type);
  const [sortOption, setSortOption] = useState<SortType>('default');
  const [selectedItem, setSelectedItem] = useState<Media | null>(null);

  // Fetch Data
  const fetchItems = async (pageNum: number) => {
    if (!endpoint) return;
    setLoading(true);
    try {
      const separator = endpoint.includes('?') ? '&' : '?';
      const res = await tmdbAxios.get(`${endpoint}${separator}page=${pageNum}`);
      
      const newItems = res.data.results.filter((item: any) => item.poster_path && item.media_type !== 'person');
      
      setItems(prev => pageNum === 1 ? newItems : [...prev, ...newItems]);
      setHasMore(res.data.page < res.data.total_pages && pageNum < 10);
    } catch (error) {
      console.error("Failed to fetch explore items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setItems([]);
      fetchItems(1);
      setFilterType(type);
    } else {
      setSearchQuery('');
      setSortOption('default');
    }
  }, [isOpen, endpoint, type]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchItems(nextPage);
    }
  };

  const processedItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.title?.toLowerCase().includes(q) || item.name?.toLowerCase().includes(q))
      );
    }

    if (filterType !== 'all') {
      result = result.filter(item => {
        const itemType = item.media_type || ((item as any).first_air_date ? 'tv' : 'movie');
        return itemType === filterType;
      });
    }

    if (sortOption === 'rating') {
      result.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortOption === 'year') {
      result.sort((a, b) => {
        const dateA = new Date(a.release_date || (a as any).first_air_date || '1970-01-01').getTime();
        const dateB = new Date(b.release_date || (b as any).first_air_date || '1970-01-01').getTime();
        return dateB - dateA;
      });
    }

    return result.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  }, [items, searchQuery, filterType, sortOption]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl"
          onClick={onClose}
        />
        
        {!selectedItem && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-[95vw] h-[90vh] bg-[#0A1428]/95 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,245,255,0.15)] flex flex-col z-10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/80 gap-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <Logo className="h-6 sm:h-8 hidden md:block" />
                <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  {title}
                </h2>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative hidden sm:block">
                  <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter results..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900/50 border border-white/10 text-white text-sm rounded-full pl-9 pr-4 py-2 w-48 lg:w-64 focus:outline-none focus:border-[#00F5FF]/50 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all"
                  />
                </div>
                <button onClick={onClose} className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between px-6 py-3 bg-slate-900/40 border-b border-white/5 gap-4">
              <div className="flex bg-slate-900/80 p-1 rounded-lg border border-white/5">
                {(['all', 'movie', 'tv'] as FilterType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterType(tab)}
                    className={cn(
                      "px-3 sm:px-5 py-1.5 rounded-md text-xs sm:text-sm font-bold capitalize transition-all",
                      filterType === tab 
                        ? "bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-white shadow-lg" 
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    {tab === 'all' ? 'All' : tab === 'movie' ? 'Movies' : 'TV Shows'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-slate-400 font-medium hidden sm:block">Sort by:</span>
                <div className="relative">
                  <select 
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortType)}
                    className="appearance-none bg-slate-900/80 border border-slate-700 text-white text-xs sm:text-sm rounded-lg focus:ring-[#00F5FF] focus:border-[#00F5FF] block pl-3 pr-8 py-2 outline-none cursor-pointer"
                  >
                    <option value="default">Default</option>
                    <option value="rating">Highest Rated</option>
                    <option value="year">Newest First</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide">
              {processedItems.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                    {processedItems.map(item => (
                      <MediaCard 
                        key={`${item.id}-${Math.random()}`} 
                        item={item} 
                        variant="portrait" 
                        className="w-full"
                        enableHoverScale
                        onClick={() => setSelectedItem(item)} 
                      />
                    ))}
                  </div>
                  
                  {hasMore && !searchQuery && (
                    <div className="mt-12 flex justify-center pb-8">
                      <button 
                        onClick={loadMore}
                        disabled={loading}
                        className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-white px-8 py-3 rounded-full font-bold transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Load More Content'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <Film className="w-16 h-16 text-slate-700 mb-4" />
                  <p className="text-xl text-slate-400 font-medium">No results found.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {selectedItem && (
          <Modal item={selectedItem} onClose={() => { setSelectedItem(null); onClose(); }} />
        )}
      </div>
    </AnimatePresence>
  );
};
