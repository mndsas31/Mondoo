import React, { createContext, useContext, useState, useEffect } from 'react';
import { Media } from '../types';
import { useAuth } from './AuthContext';
import { apiFetch } from '../services/api';

interface WatchlistContextType {
  watchlist: Media[];
  addToWatchlist: (item: Media) => void;
  removeFromWatchlist: (id: number) => void;
  isInWatchlist: (id: number) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, openAuthModal, token } = useAuth();
  const [watchlist, setWatchlist] = useState<Media[]>(() => {
    try {
      const saved = localStorage.getItem('mondoflix_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('mondoflix_watchlist', JSON.stringify(watchlist));
      } catch {}
    }
  }, [watchlist, user]);

  // Sync with backend when user logs in
  useEffect(() => {
    if (user && token) {
      const syncWatchlist = async () => {
        try {
          let localWatchlist: Media[] = [];
          try {
            localWatchlist = JSON.parse(localStorage.getItem('mondoflix_watchlist') || '[]');
          } catch {
            localWatchlist = [];
          }
          
          if (localWatchlist.length > 0) {
            await apiFetch('/watchlist/merge', {
              method: 'POST',
              body: JSON.stringify({ items: localWatchlist })
            });
            localStorage.removeItem('mondoflix_watchlist');
          }

          const serverWatchlist = await apiFetch('/watchlist');
          if (serverWatchlist) {
            setWatchlist(serverWatchlist.map((item: any) => ({
              id: item.id,
              media_type: item.media_type,
              title: item.title,
              name: item.title,
              poster_path: item.poster_path,
              vote_average: 0,
              vote_count: 0,
              genre_ids: []
            })));
          }
        } catch (e) {
          console.error("Failed to sync watchlist", e);
        }
      };
      syncWatchlist();
    }
  }, [user, token]);

  const addToWatchlist = async (item: Media) => {
    if (!user) {
      openAuthModal();
      setWatchlist((prev) => {
        if (!prev.find((i) => i.id === item.id)) return [...prev, item];
        return prev;
      });
      return;
    }
    
    try {
      setWatchlist((prev) => {
        if (!prev.find((i) => i.id === item.id)) return [...prev, item];
        return prev;
      });
      
      await apiFetch('/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          media_id: item.id,
          media_type: item.media_type || (item as any).first_air_date ? 'tv' : 'movie',
          title: item.title || item.name,
          poster_path: item.poster_path
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const removeFromWatchlist = async (id: number) => {
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
    
    if (user && token) {
      try {
        await apiFetch(`/watchlist/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const isInWatchlist = (id: number) => {
    return watchlist.some((item) => item.id === id);
  };

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};
