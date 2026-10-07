import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock } from 'lucide-react';
import { Season, Episode } from '../../types';
import { getSeasonDetails, getImageUrl } from '../../services/tmdbApi';
import { cn } from '../../utils/cn';

interface EpisodeListProps {
  tvId: number;
  seasons: Season[];
  currentSeason: number;
  currentEpisode: number;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  tvId,
  seasons,
  currentSeason,
  currentEpisode
}) => {
  const navigate = useNavigate();
  const [selectedSeason, setSelectedSeason] = useState<number>(currentSeason || 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ensure we have a valid season selected
    if (currentSeason && seasons.some(s => s.season_number === currentSeason)) {
      setSelectedSeason(currentSeason);
    } else if (seasons.length > 0) {
      setSelectedSeason(seasons.find(s => s.season_number > 0)?.season_number || seasons[0].season_number);
    }
  }, [currentSeason, seasons]);

  useEffect(() => {
    let mounted = true;
    const fetchSeason = async () => {
      if (!selectedSeason) return;
      setLoading(true);
      try {
        const res = await getSeasonDetails(tvId, selectedSeason);
        if (mounted) {
          setEpisodes(res.data.episodes || []);
        }
      } catch (e) {
        console.error("Failed to fetch season details", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSeason();
    return () => { mounted = false; };
  }, [tvId, selectedSeason]);

  const handleEpisodeClick = (seasonNum: number, episodeNum: number) => {
    const activePartyCode = sessionStorage.getItem('active_party_code');
    const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
    navigate(`/watch/tv/${tvId}/season/${seasonNum}/episode/${episodeNum}${partyQuery}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!seasons || seasons.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 border-t border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h3 className="text-2xl font-bold text-white">Episodes</h3>
        
        {/* Season Selector */}
        <div className="relative">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="appearance-none bg-slate-900 border border-white/10 text-white font-medium py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-[#00F5FF]/50 transition-colors w-full sm:w-auto"
          >
            {seasons.filter(s => s.season_number > 0).map(season => (
              <option key={season.season_number} value={season.season_number}>
                Season {season.season_number}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-video bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {episodes.map(ep => {
            const isCurrent = ep.season_number === currentSeason && ep.episode_number === currentEpisode;
            
            return (
              <div 
                key={ep.id}
                onClick={() => handleEpisodeClick(ep.season_number, ep.episode_number)}
                className={cn(
                  "group relative flex flex-col bg-slate-900/50 border rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
                  isCurrent 
                    ? "border-[#00F5FF] shadow-[0_0_15px_rgba(0,245,255,0.2)] bg-slate-900" 
                    : "border-white/5 hover:border-white/20 hover:bg-slate-800"
                )}
              >
                <div className="relative aspect-video bg-slate-800 overflow-hidden">
                  {ep.still_path ? (
                    <img 
                      src={getImageUrl(ep.still_path, 'w500')} 
                      alt={ep.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <PlayCircle className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                      <PlayCircle className="w-6 h-6 fill-current text-[#00F5FF]" />
                    </div>
                  </div>
                  
                  {/* Current Badge */}
                  {isCurrent && (
                    <div className="absolute top-2 left-2 bg-[#00F5FF] text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                      Playing
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={cn("font-bold text-sm line-clamp-1", isCurrent ? "text-[#00F5FF]" : "text-white")}>
                      {ep.episode_number}. {ep.name}
                    </h4>
                    {ep.runtime && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium whitespace-nowrap bg-white/5 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" /> {ep.runtime}m
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-auto">
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
