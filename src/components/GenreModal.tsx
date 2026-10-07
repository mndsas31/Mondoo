import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search as SearchIcon, Film, Tv, Star, ChevronDown, Plus, Check } from 'lucide-react';
import { tmdbAxios, getImageUrl } from '../services/tmdbApi';
import { Media } from '../types';
import { useWatchlist } from '../context/WatchlistContext';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { MediaCard } from './MediaCard';
import { cn } from '../utils/cn';

interface GenreModalProps {
  isOpen: boolean;
  onClose: () => void;
  genre: { id: number; name: string } | null;
  onSelect: (item: Media) => void;
}

type FilterType = 'all' | 'movie' | 'tv';
type SortType = 'popularity' | 'rating' | 'year';

export const GenreModal: React.FC<GenreModalProps> = ({ isOpen, onClose, genre, onSelect }) => {
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortType>('popularity');
  
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { user, openAuthModal } = useAuth();

  const fetchItems = async (pageNum: number, currentFilter: FilterType, currentSort: SortType) => {
    if (!genre) return;
    setLoading(true);
    try {
      let sortParamMovie = 'popularity.desc';
      let sortParamTv = 'popularity.desc';
      
      if (currentSort === 'rating') {
        sortParamMovie = 'vote_average.desc';
        sortParamTv = 'vote_average.desc';
      } else if (currentSort === 'year') {
        sortParamMovie = 'primary_release_date.desc';
        sortParamTv = 'first_air_date.desc';
      }

      const fetchMovies = () => 
        tmdbAxios.get(`/discover/movie`, { params: { with_genres: genre.id, page: pageNum, sort_by: sortParamMovie } });

      const fetchTv = () => 
        tmdbAxios.get(`/discover/tv`, { params: { with_genres: genre.id, page: pageNum, sort_by: sortParamTv } });

      let newItems: Media[] = [];

      if (currentFilter === 'all') {
        const [resM, resT] = await Promise.all([fetchMovies(), fetchTv()]);
        newItems = [...resM.data.results, ...resT.data.results];
        
        if (currentSort === 'rating') {
           newItems.sort((a,b) => (b.vote_average || 0) - (a.vote_average || 0));
        } else if (currentSort === 'year') {
           newItems.sort((a,b) => {
              const dateA = new Date(a.release_date || (a as any).first_air_date || '1970-01-01').getTime();
              const dateB = new Date(b.release_date || (b as any).first_air_date || '1970-01-01').getTime();
              return dateB - dateA;
           });
        } else {
           newItems.sort((a,b) => (b.popularity || 0) - (a.popularity || 0));
        }
      } else if (currentFilter === 'movie') {
        const res = await fetchMovies();
        newItems = res.data.results;
      } else {
        const res = await fetchTv();
        newItems = res.data.results;
      }
      
      newItems = newItems
        .filter(item => item.poster_path && item.media_type !== 'person')
        .map(item => ({
          ...item,
          media_type: item.media_type || (currentFilter === 'tv' ? 'tv' : (currentFilter === 'movie' ? 'movie' : ((item as any).first_air_date ? 'tv' : 'movie')))
        }));

      setItems(prev => pageNum === 1 ? newItems : [...prev, ...newItems]);
      setHasMore(pageNum < 8);
    } catch (error) {
      console.error("Failed to fetch genre items", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && genre) {
      setPage(1);
      fetchItems(1, filterType, sortOption);
    }
  }, [isOpen, genre, filterType, sortOption]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchItems(nextPage, filterType, sortOption);
    }
  };

  const handleWatchlistAction = (e: React.MouseEvent, item: Media) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal();
      return;
    }
    if (watchlist.some(w => w.id === item.id)) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist(item);
    }
  };

  const processedItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => (item.title?.toLowerCase().includes(q) || item.name?.toLowerCase().includes(q)));
  }, [items, searchQuery]);

  if (!isOpen || !genre) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative w-full max-w-[95vw] h-[90vh] bg-[#0A1428]/95 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,245,255,0.15)] flex flex-col z-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/80 gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <Logo className="h-6 sm:h-8 hidden md:block" />
              <div className="h-8 w-px bg-white/10 hidden md:block"></div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                {genre.name} 
                <span className="text-xs font-bold uppercase tracking-widest text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-1 rounded-md border border-[#00F5FF]/20">
                  Genre
                </span>
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter this genre..."
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
                  <option value="popularity">Most Popular</option>
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
                      onClick={() => onSelect(item)} 
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
              <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in">
                <Film className="w-20 h-20 text-slate-700 mb-4 opacity-50" />
                <h3 className="text-2xl font-black text-white mb-2">No results found</h3>
                <p className="text-slate-400">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
