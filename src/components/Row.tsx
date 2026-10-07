import React, { useRef } from 'react';
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
  isLargeRow?: boolean; // Kept for backwards compatibility if needed, but variant is preferred
}

export const Row: React.FC<RowProps> = ({ 
  title, items, variant, isTop10, progressMap, 
  showTabs, tabs = ['Movies', 'Series'], activeTab, onTabChange, 
  onOpenModal, onExploreAll, isLargeRow 
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  
  // Resolve variant if older isLargeRow prop was used
  const cardVariant = variant || (isLargeRow ? 'landscape' : 'portrait');
  
  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? scrollLeft - clientWidth + 100 : scrollLeft + clientWidth - 100;
      rowRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const displayItems = isTop10 ? items.slice(0, 10) : items;

  return (
    <div className="relative mb-8 group/row">
      {/* Section Header */}
      <div className="px-4 md:px-10 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-violet-500 rounded-full" />
          <h2 className="text-white text-xl md:text-2xl font-semibold flex items-center">
            {title}
            {onExploreAll && (
              <button 
                onClick={onExploreAll}
                className="text-violet-400 text-sm ml-4 font-semibold hover:text-cyan-400 transition-colors hidden sm:inline-block"
              >
                Explore All &gt;
              </button>
            )}
          </h2>
        </div>

        {showTabs && tabs.length > 0 && (
          <div className="flex items-center gap-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange && onTabChange(tab)}
                className={`relative text-sm font-medium transition-colors pb-1 ${activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Carousel */}
      <div className="relative">
        <div 
          className="absolute top-0 bottom-[60px] left-0 w-12 bg-[#0A1428]/80 backdrop-blur-sm z-30 hidden sm:flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer rounded-r-2xl"
          onClick={() => handleScroll('left')}
        >
          <ChevronLeft className="text-white w-8 h-8 hover:text-cyan-400 transition-colors" />
        </div>
        
        <div 
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-4 snap-x snap-mandatory scroll-smooth"
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

        <div 
          className="absolute top-0 bottom-[60px] right-0 w-12 bg-[#0A1428]/80 backdrop-blur-sm z-30 hidden sm:flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer rounded-l-2xl"
          onClick={() => handleScroll('right')}
        >
          <ChevronRight className="text-white w-8 h-8 hover:text-cyan-400 transition-colors" />
        </div>
      </div>
    </div>
  );
};
