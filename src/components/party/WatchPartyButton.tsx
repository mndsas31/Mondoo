import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { WatchPartyModal } from './WatchPartyModal';
import type { Media } from '../../types';

export interface WatchPartyButtonProps {
  media: Media;
  season?: number;
  episode?: number;
  onOpenSidebar?: () => void;
}

export function WatchPartyButton({ media, season, episode, onOpenSidebar }: WatchPartyButtonProps) {
  const [showPartyModal, setShowPartyModal] = useState(false);

  const handleClick = () => {
    if (onOpenSidebar) {
      onOpenSidebar();
    } else {
      setShowPartyModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-full font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
        title="Start or Join Watch Party"
      >
        <Users className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Watch Party</span>
      </button>

      {showPartyModal && !onOpenSidebar && (
        <WatchPartyModal
          isOpen={showPartyModal}
          onClose={() => setShowPartyModal(false)}
          media={media}
          season={season}
          episode={episode}
        />
      )}
    </>
  );
}
