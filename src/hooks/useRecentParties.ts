import { useState, useEffect, useCallback } from 'react';
import { 
  getRecentParties, 
  saveRecentParty, 
  removeRecentParty, 
  clearRecentParties, 
  syncRecentPartiesWithServer,
  RecentPartySession 
} from '../utils/recentParties';

export function useRecentParties() {
  const [parties, setParties] = useState<RecentPartySession[]>(getRecentParties);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const updated = await syncRecentPartiesWithServer();
      setParties(updated);
    } catch {
      setParties(getRecentParties());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setParties(getRecentParties());
    };
    window.addEventListener('mondoflix:recent_parties_updated', handleUpdate);
    refresh();

    return () => {
      window.removeEventListener('mondoflix:recent_parties_updated', handleUpdate);
    };
  }, [refresh]);

  const removeParty = useCallback((code: string) => {
    removeRecentParty(code);
  }, []);

  const clearAll = useCallback(() => {
    clearRecentParties();
  }, []);

  const saveParty = useCallback((party: Omit<RecentPartySession, 'lastJoinedAt'> & { lastJoinedAt?: number }) => {
    saveRecentParty(party);
  }, []);

  return {
    parties,
    isLoading,
    refresh,
    removeParty,
    clearAll,
    saveParty,
  };
}
