import React from 'react';
import { Play, Clock, Crown, Users, Trash2, Copy, Check, Tv, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecentPartySession } from '../../utils/recentParties';
import { useRecentParties } from '../../hooks/useRecentParties';
import { getImageUrl } from '../../services/tmdbApi';

interface RecentPartiesSectionProps {
  onSelectSession?: (session: RecentPartySession) => void;
  compact?: boolean;
  limit?: number;
  className?: string;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Recently';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function RecentPartiesSection({
  onSelectSession,
  compact = false,
  limit,
  className = ''
}: RecentPartiesSectionProps) {
  const navigate = useNavigate();
  const { parties, removeParty, clearAll } = useRecentParties();
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const displayParties = limit ? parties.slice(0, limit) : parties;

  const handleJumpIn = (session: RecentPartySession) => {
    if (onSelectSession) {
      onSelectSession(session);
      return;
    }

    sessionStorage.setItem('active_party_code', session.code);

    let targetUrl = `/watch/${session.mediaType}/${session.mediaId}`;
    if (session.mediaType === 'tv' && session.season && session.episode) {
      targetUrl += `/season/${session.season}/episode/${session.episode}`;
    }
    targetUrl += `?party=${session.code}`;

    navigate(targetUrl);
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRemove = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    removeParty(code);
  };

  if (displayParties.length === 0) {
    return (
      <div className={`text-center py-8 px-4 rounded-2xl bg-white/5 border border-white/5 ${className}`}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Clock className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-sm text-slate-200">No Recent Watch Parties</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Parties you host or join will appear here so you can quickly jump back in anytime!
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">
            Recently Viewed Sessions ({parties.length})
          </h4>
        </div>
        {parties.length > 1 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {displayParties.map((session) => {
          const posterUrl = session.posterPath ? getImageUrl(session.posterPath, 'w500') : null;
          const isCopied = copiedCode === session.code;

          return (
            <div
              key={session.code}
              onClick={() => handleJumpIn(session)}
              className="group relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer shadow-md hover:shadow-cyan-500/10 flex items-center gap-3 overflow-hidden"
            >
              {/* Media Poster Thumbnail */}
              <div className="w-12 h-16 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 relative flex items-center justify-center shadow-inner">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={session.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  session.mediaType === 'tv' ? (
                    <Tv className="w-5 h-5 text-slate-500" />
                  ) : (
                    <Film className="w-5 h-5 text-slate-500" />
                  )
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-cyan-500/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Play className="w-4 h-4 text-white fill-white shadow-sm" />
                </div>
              </div>

              {/* Session Meta */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    {session.code}
                  </span>
                  {session.isHost && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                      <Crown className="w-2.5 h-2.5" /> Host
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                    {formatRelativeTime(session.lastJoinedAt)}
                  </span>
                </div>

                <h5 className="font-bold text-xs text-white truncate group-hover:text-cyan-300 transition-colors">
                  {session.title}
                </h5>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  {session.mediaType === 'tv' && session.season && session.episode ? (
                    <span className="text-slate-300 font-medium">
                      S{session.season} · E{session.episode}
                    </span>
                  ) : (
                    <span className="capitalize">{session.mediaType}</span>
                  )}
                  {session.hostName && !session.isHost && (
                    <>
                      <span>•</span>
                      <span className="truncate">by {session.hostName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(e, session.code)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Copy Party Code"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, session.code)}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
