import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Media } from '../types';
import { MediaCard } from './MediaCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RowProps {
  title: string;
  items: Media[];
  variant?: 'portrait' | 'landscape';
  isTop10?: boolean;
  progressMap?: Record<number, number>; 
  showTabs?: boolean;
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenModal: (item: Media) => void;
  onExploreAll?: () => void;
  isLargeRow?: boolean;
}

export const Row: React.FC<RowProps> = ({ 
  title, items = [], variant, isTop10, progressMap, 
  showTabs, tabs = ['Movies', 'Series'], activeTab, onTabChange, 
  onOpenModal, onExploreAll, isLargeRow 
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  
  const cardVariant = variant || (isLargeRow ? 'landscape' : 'portrait');
  
  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? scrollLeft - clientWidth + 100 : scrollLeft + clientWidth - 100;
      rowRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const displayItems = isTop10 ? (items || []).slice(0, 10) : (items || []);

  return (
    <div className="relative mb-10 group/row select-none">
      {/* Section Header */}
      <div className="px-4 md:px-10 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-400 via-sky-400 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight flex items-center">
            {title}
            {onExploreAll && (
              <motion.button 
                whileHover={{ x: 3 }}
                onClick={onExploreAll}
                className="text-cyan-400/80 hover:text-cyan-300 text-xs sm:text-sm ml-4 font-semibold transition-colors hidden sm:inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Explore All</span>
                <span className="text-xs">&rarr;</span>
              </motion.button>
            )}
          </h2>
        </div>

        {showTabs && tabs.length > 0 && (
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange && onTabChange(tab)}
                  className={`relative px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${isActive ? 'text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId={`row-tab-${title}`}
                      className="absolute inset-0 bg-cyan-500/20 border border-cyan-400/40 rounded-lg -z-10 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}
                  <span>{tab}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Carousel */}
      <div className="relative">
        <button 
          className="absolute top-0 bottom-[45px] left-0 w-12 bg-gradient-to-r from-[#030712] via-[#030712]/80 to-transparent z-30 hidden sm:flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer rounded-r-2xl"
          onClick={() => handleScroll('left')}
          aria-label="Scroll left"
        >
          <ChevronLeft className="text-white w-7 h-7 hover:text-cyan-400 transition-colors drop-shadow-md" />
        </button>
        
        <div 
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-4 pt-1 snap-x snap-mandatory scroll-smooth"
        >
          {displayItems.map((item, index) => (
            <MediaCard 
              key={`${item.id}-${index}`} 
              item={item} 
              variant={cardVariant}
              rank={isTop10 ? index + 1 : undefined}
              progress={progressMap ? progressMap[item.id] : undefined}
              onClick={onOpenModal} 
            />
          ))}
        </div>

        <button 
          className="absolute top-0 bottom-[45px] right-0 w-12 bg-gradient-to-l from-[#030712] via-[#030712]/80 to-transparent z-30 hidden sm:flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer rounded-l-2xl"
          onClick={() => handleScroll('right')}
          aria-label="Scroll right"
        >
          <ChevronRight className="text-white w-7 h-7 hover:text-cyan-400 transition-colors drop-shadow-md" />
        </button>
      </div>
    </div>
  );
};
