import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Film, Tv, Trash2, Star, Play, PlayCircle, Flame } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useContinueWatching } from '../hooks/useContinueWatching';
import { getImageUrl } from '../services/tmdbApi';
import { Media } from '../types';
import { Logo } from './Logo';
import { Modal } from './Modal';
import { MediaCard } from './MediaCard';
import { cn } from '../utils/cn';

interface MyListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'movie' | 'tv';
type SortType = 'recent' | 'alpha' | 'rating';

export const MyListModal: React.FC<MyListModalProps> = ({ isOpen, onClose }) => {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const { items: progressItems } = useContinueWatching();
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortOption, setSortOption] = useState<SortType>('recent');
  const [selectedItem, setSelectedItem] = useState<Media | null>(null);

  if (!isOpen) return null;

  // Filter List
  const filteredList = watchlist.filter(item => {
    const type = item.media_type || ((item as any).first_air_date ? 'tv' : 'movie');
    if (activeTab === 'all') return true;
    return type === activeTab;
  });

  // Sort List
  const sortedList = [...filteredList].sort((a, b) => {
    const titleA = a.title || a.name || '';
    const titleB = b.title || b.name || '';
    
    if (sortOption === 'alpha') {
      return titleA.localeCompare(titleB);
    }
    if (sortOption === 'rating') {
      return (b.vote_average || 0) - (a.vote_average || 0);
    }
    // Default 'recent' uses array order (newest at the end usually)
    return 0;
  });

  // Reverse if recent so newest is first
  if (sortOption === 'recent') {
    sortedList.reverse();
  }

  const handleBrowseTrending = () => {
    onClose();
    // Scroll to new and popular or trending (assuming it's on home)
    window.scrollTo({ top: 500, behavior: 'smooth' });
  };

  const getProgress = (mediaId: number) => {
    const p = progressItems.find(p => p.media.id === mediaId);
    if (!p || !p.duration_seconds) return 0;
    return (p.progress_seconds / p.duration_seconds) * 100;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl"
          onClick={onClose}
        />
        
        {/* Modal Container */}
        {!selectedItem && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[90vw] h-[85vh] bg-[#0A1428]/95 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,245,255,0.15)] flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-white/5 bg-slate-900/50 gap-4">
              <div className="flex items-center gap-6">
                <Logo className="h-8 hidden sm:block" />
                <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  My List
                  <span className="text-sm font-medium bg-[#00F5FF]/10 text-[#00F5FF] px-2 py-0.5 rounded-full border border-[#00F5FF]/20">
                    {watchlist.length} {watchlist.length === 1 ? 'Item' : 'Items'}
                  </span>
                </h2>
              </div>
              
              <button 
                onClick={onClose}
                className="absolute top-5 right-6 p-2 bg-slate-800/50 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Controls (Tabs & Sort) */}
            {watchlist.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-900/30 border-b border-white/5 gap-4">
                <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
                  {(['all', 'movie', 'tv'] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-all",
                        activeTab === tab 
                          ? "bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-white shadow-lg" 
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      {tab === 'all' ? 'All' : tab === 'movie' ? 'Movies' : 'TV Shows'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 font-medium">Sort by:</span>
                  <select 
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortType)}
                    className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-[#00F5FF] focus:border-[#00F5FF] block p-2 outline-none cursor-pointer"
                  >
                    <option value="recent">Recently Added</option>
                    <option value="alpha">Title A-Z</option>
                    <option value="rating">Top Rated</option>
                  </select>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-hide">
              {sortedList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {sortedList.map(item => (
                    <div 
                      key={item.id}
                      className="group/watchlist-card relative flex flex-col transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1.5 hover:z-30 transform-gpu cursor-pointer rounded-xl"
                    >
                      <MediaCard 
                        item={item} 
                        variant="portrait" 
                        progress={getProgress(item.id)}
                        onClick={() => setSelectedItem(item)} 
                        className="w-full"
                      />
                      {/* Quick remove from watchlist button on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(item.id);
                        }}
                        title="Remove from My List"
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/85 hover:bg-rose-600 text-slate-300 hover:text-white rounded-full backdrop-blur-md border border-white/10 opacity-0 group-hover/watchlist-card:opacity-100 transition-all duration-200 z-40 shadow-lg hover:scale-110"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                  <div className="w-32 h-32 mb-6 text-slate-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full opacity-50">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                      <line x1="7" y1="2" x2="7" y2="22"></line>
                      <line x1="17" y1="2" x2="17" y2="22"></line>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <line x1="2" y1="7" x2="7" y2="7"></line>
                      <line x1="2" y1="17" x2="7" y2="17"></line>
                      <line x1="17" y1="17" x2="22" y2="17"></line>
                      <line x1="17" y1="7" x2="22" y2="7"></line>
                    </svg>
                  </div>
                  <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Your list is empty</h3>
                  <p className="text-slate-400 mb-8 max-w-sm text-center text-lg">
                    Discover new movies and TV shows, and save them here to watch later.
                  </p>
                  <button 
                    onClick={handleBrowseTrending}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] hover:shadow-[0_0_25px_rgba(0,245,255,0.4)] text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105"
                  >
                    <Flame className="w-5 h-5 fill-current" />
                    Browse Trending
                  </button>
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
