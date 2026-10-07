import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getSeasonDetails, getImageUrl } from '../services/tmdbApi';
import { Episode, Season } from '../types';
import { cn } from '../utils/cn';

interface EpisodesListProps {
  tvId: number;
  seasons: Season[];
  currentSeason: number;
  currentEpisode: number;
  isHost?: boolean;
  onlyHostControls?: boolean;
  partyCode?: string | null;
  onRequestControl?: () => void;
}

export const EpisodesList: React.FC<EpisodesListProps> = ({ 
  tvId, 
  seasons, 
  currentSeason, 
  currentEpisode,
  isHost = true,
  onlyHostControls = false,
  partyCode = null,
  onRequestControl
}) => {
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [lockedNotice, setLockedNotice] = useState(false);
  const navigate = useNavigate();

  const isLockedForMember = Boolean(partyCode && onlyHostControls && !isHost);

  useEffect(() => {
    let mounted = true;
    const fetchEpisodes = async () => {
      setLoading(true);
      try {
        const res = await getSeasonDetails(tvId, selectedSeason);
        if (mounted) setEpisodes(res.data.episodes || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchEpisodes();
    return () => { mounted = false; };
  }, [tvId, selectedSeason]);

  const validSeasons = seasons.filter(s => s.season_number > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 sm:py-8 w-full border-t border-white/5">
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Episodes</h2>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg outline-none focus:border-[#00F5FF] transition-colors cursor-pointer"
        >
          {validSeasons.map(s => (
            <option key={s.id} value={s.season_number}>
              Season {s.season_number}
            </option>
          ))}
        </select>
      </div>

      {lockedNotice && (
        <div className="mb-4 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <p className="text-xs font-semibold text-amber-200">
            🔒 Only the party host can change episodes. Request control from host to navigate.
          </p>
          {onRequestControl && (
            <button
              onClick={() => {
                onRequestControl();
                setLockedNotice(false);
              }}
              className="px-2.5 py-1 bg-cyan-500 text-black font-bold text-xs rounded-lg hover:bg-cyan-400 transition-colors shrink-0 cursor-pointer"
            >
              Request Control
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 sm:h-28 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-4">
          {episodes.map(ep => {
            const isPlaying = selectedSeason === currentSeason && ep.episode_number === currentEpisode;
            return (
              <div 
                key={ep.id}
                onClick={() => {
                  if (isPlaying) return;
                  if (isLockedForMember) {
                    setLockedNotice(true);
                    setTimeout(() => setLockedNotice(false), 4000);
                    return;
                  }
                  const queryParams = new URLSearchParams(window.location.search);
                  const activePartyCode = queryParams.get('party') || sessionStorage.getItem('active_party_code');
                  const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
                  navigate(`/watch/tv/${tvId}/season/${selectedSeason}/episode/${ep.episode_number}${partyQuery}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  "group flex flex-row gap-3 sm:gap-4 p-2.5 sm:p-4 rounded-xl transition-all duration-300 border touch-manipulation",
                  isLockedForMember && !isPlaying ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]",
                  isPlaying 
                    ? "bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_15px_rgba(0,245,255,0.1)]" 
                    : "bg-slate-900/40 border-white/5 hover:bg-slate-800/70 hover:border-white/15"
                )}
              >
                <div className="relative w-28 sm:w-44 md:w-56 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-slate-800 self-center sm:self-start">
                  {ep.still_path ? (
                    <img
                      src={getImageUrl(ep.still_path, 'w500')}
                      alt={ep.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      No Image
                    </div>
                  )}
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity",
                    isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <Play className={cn("w-6 h-6 sm:w-10 sm:h-10", isPlaying ? "text-[#00F5FF]" : "text-white drop-shadow-lg")} />
                  </div>
                </div>

                <div className="flex-1 py-1 min-w-0 flex flex-col justify-center sm:justify-start">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={cn("text-xs sm:text-base font-bold leading-snug line-clamp-2", isPlaying ? "text-[#00F5FF]" : "text-white")}>
                      {ep.episode_number}. {ep.name}
                    </h3>
                    {ep.runtime && (
                      <span className="text-slate-400 text-[11px] sm:text-xs font-mono shrink-0">
                        {ep.runtime}m
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] sm:text-xs leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {ep.overview || "No description available."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
