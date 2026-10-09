import { useState, useEffect, useCallback } from 'react';
import { Media } from '../types';

export interface RecentlyWatchedItem {
  media: Media;
  openedAt: number; // timestamp
}

const STORAGE_KEY = 'mondoflix_recently_watched';
const EVENT_NAME = 'mondoflix_recently_watched_updated';

export const useRecentlyWatched = () => {
  const [items, setItems] = useState<RecentlyWatchedItem[]>([]);

  const loadItems = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: RecentlyWatchedItem[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed.sort((a, b) => b.openedAt - a.openedAt));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse recently watched from localStorage', e);
    }
    setItems([]);
  }, []);

  useEffect(() => {
    loadItems();

    const handleUpdate = () => {
      loadItems();
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadItems]);

  const addRecentlyWatched = useCallback((media: Media) => {
    if (!media || !media.id) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list: RecentlyWatchedItem[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      // Remove existing item with same id
      const filtered = list.filter(item => item.media.id !== media.id);

      // Add to front with fresh timestamp
      const newItem: RecentlyWatchedItem = {
        media: {
          ...media,
          media_type: media.media_type || ((media as any).first_air_date ? 'tv' : 'movie')
        },
        openedAt: Date.now()
      };

      const updated = [newItem, ...filtered].slice(0, 20);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setItems(updated);
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (e) {
      console.error('Error adding to recently watched', e);
    }
  }, []);

  const removeRecentlyWatched = useCallback((mediaId: number) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list: RecentlyWatchedItem[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      const updated = list.filter(item => item.media.id !== mediaId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setItems(updated);
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (e) {
      console.error('Error removing recently watched item', e);
    }
  }, []);

  const clearRecentlyWatched = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setItems([]);
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (e) {
      console.error('Error clearing recently watched', e);
    }
  }, []);

  return {
    items,
    addRecentlyWatched,
    removeRecentlyWatched,
    clearRecentlyWatched,
    refresh: loadItems
  };
};
