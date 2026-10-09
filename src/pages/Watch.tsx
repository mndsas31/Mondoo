import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Plus, Check, MessageSquare, Info, ListVideo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, getImageUrl } from '../services/tmdbApi';
import { MediaDetails as MediaDetailsType, Cast, Media } from '../types';
import { useWatchlist } from '../context/WatchlistContext';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { useRecentlyWatched } from '../hooks/useRecentlyWatched';
import { PlayerHeader } from '../components/player/PlayerHeader';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { useIdleHide } from '../hooks/useIdleHide';
import { useLocation } from 'react-router-dom';
import { useWatchParty, getUserIdentity } from '../hooks/useWatchParty';
import { WatchPartySidebar } from '../components/party/WatchPartySidebar';
import { HostPausedOverlay } from '../components/party/HostPausedOverlay';
import { AutoNextOverlay } from '../components/player/AutoNextOverlay';
import { FloatingReactions } from '../components/party/FloatingReactions';
import { MediaDetails } from '../components/MediaDetails';
import { EpisodesList } from '../components/EpisodesList';
import { Row } from '../components/Row';
import { useAuth } from '../context/AuthContext';
import { buildVidkingUrl } from '../utils/vidking';
import { useSources } from '../hooks/useSources';
import { SERVERS } from '../utils/servers';
import { PlayerAdapter } from '../utils/playerAdapter';

export const Watch: React.FC = () => {
  const { type, id, season, episode } = useParams<{ type: string; id: string; season?: string; episode?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const partyCode = queryParams.get('party');
  const sParam = queryParams.get('s');
  const eParam = queryParams.get('e');
  
  const { isInWatchlist } = useWatchlist();
  const { openAuthModal } = useAuth();
  const { addRecentlyWatched } = useRecentlyWatched();
  
  const numId = Number(id);
  const numSeason = Number(season) || Number(sParam) || 1;
  const numEpisode = Number(episode) || Number(eParam) || 1;

  useEffect(() => {
    if (partyCode) {
      sessionStorage.setItem('active_party_code', partyCode);
      setShowSidebar(true);
    }
  }, [partyCode]);

  const [retryCount, setRetryCount] = useState(0);
  const [details, setDetails] = useState<MediaDetailsType | null>(null);
  const [cast, setCast] = useState<Cast[]>([]);
  const [similar, setSimilar] = useState<Media[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  
  const isIdle = useIdleHide(3000);
  const [resyncProgress, setResyncProgress] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(() => Boolean(partyCode));
  const [mobilePartyTab, setMobilePartyTab] = useState<'chat' | 'details' | 'episodes'>('chat');
  const playerAdapterRef = useRef<PlayerAdapter | null>(null);

  const { sources, activeSource, setActiveSource, loading: sourcesLoading, nextSource } = useSources(
    type as any, 
    numId, 
    numSeason, 
    numEpisode
  );

  const {
    party, members, messages, isHost, error: partyError, isConnected, hostPaused,
    publishState, togglePause, sendChatMessage, sendReaction, expectedHostPosition, checkDrift, driftSeconds,
    floatingReactions, typingUsers, userAvatar, userColor, onlyHostControls, controlGrantedTo,
    controlRequests, myControlRequestPending, controlFeedback, clearControlFeedback,
    requestControl, grantControl, declineControl,
    updatePartySettings, transferHost, setUserAvatar, setUserColor, sendTyping, sendMemberStatus, leaveParty, endParty, kickMember,
    forceResync
  } = useWatchParty({
    code: partyCode,
    onRequestResync: useCallback((seconds) => {
      // Set resync progress for smooth video playback synchronization
      setResyncProgress(prev => {
        if (prev !== null && Math.abs(prev - seconds) < 1.0) return prev;
        return seconds;
      });
      playerAdapterRef.current?.seek(seconds);
    }, []),
    onPlaybackAction: useCallback((action, time) => {
      if (action === 'play') {
        playerAdapterRef.current?.play();
      } else if (action === 'pause') {
        playerAdapterRef.current?.pause();
      } else if (action === 'seek') {
        playerAdapterRef.current?.seek(time);
      }
    }, []),
    onPlaybackSync: useCallback(({ isPlaying, targetTime, isHeartbeat, drift }) => {
      if (!isPlaying) {
        playerAdapterRef.current?.pause();
        playerAdapterRef.current?.seek(targetTime);
      } else {
        if (drift > 1.8 || !isHeartbeat) {
          playerAdapterRef.current?.seek(targetTime);
        }
        playerAdapterRef.current?.play();
      }
    }, []),
    onNavigateEpisode: useCallback((s, e) => {
      const targetUrl = `/watch/tv/${id}/season/${s}/episode/${e}${partyCode ? `?party=${partyCode}` : ''}`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        navigate(targetUrl);
      }
    }, [id, partyCode, navigate]),
    onNavigateMedia: useCallback((mType, mId, s, e) => {
      let targetUrl = `/watch/${mType}/${mId}`;
      if (mType === 'tv' && s && e) {
        targetUrl += `/season/${s}/episode/${e}`;
      }
      if (partyCode) {
        targetUrl += `?party=${partyCode}`;
      }
      if (window.location.pathname + window.location.search !== targetUrl) {
        navigate(targetUrl);
      }
    }, [partyCode, navigate]),
    onServerChange: useCallback((serverKey) => {
      const matching = sources.find(s => s.server_key === serverKey);
      if (matching && activeSource?.server_key !== serverKey) {
        setActiveSource(matching);
      }
    }, [sources, activeSource?.server_key, setActiveSource]),
    onPartyEnded: useCallback((msg) => {
      sessionStorage.removeItem('active_party_code');
      const url = new URL(window.location.href);
      url.searchParams.delete('party');
      window.location.href = url.pathname + url.search;
    }, [])
  });

  const myIdentity = getUserIdentity();
  const canControl = isHost || !onlyHostControls || (controlGrantedTo && String(controlGrantedTo) === String(myIdentity.id));

  const handleExitParty = useCallback(async () => {
    try {
      await leaveParty();
    } catch (e) {
      console.error(e);
    }
    sessionStorage.removeItem('active_party_code');
    const url = new URL(window.location.href);
    url.searchParams.delete('party');
    window.location.href = url.pathname + url.search;
  }, [leaveParty]);

  const handleEndParty = useCallback(async () => {
    try {
      await endParty();
    } catch (e) {
      console.error(e);
    }
    sessionStorage.removeItem('active_party_code');
    const url = new URL(window.location.href);
    url.searchParams.delete('party');
    window.location.href = url.pathname + url.search;
  }, [endParty]);

  // Prevent repeated broadcast of the same media state
  const lastBroadcastKeyRef = useRef<string>('');

  // Automatically broadcast movie/show changes if user has control and is viewing a different title in the active watch party
  useEffect(() => {
    if (!party || !details || !partyCode) return;
    if (!canControl) return;
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    const mediaTitle = details.title || details.name || 'Watch Party';
    
    const isDifferentMedia = party.media_id !== undefined && Number(party.media_id) !== Number(numId);
    const isDifferentType = party.media_type && party.media_type !== mediaType;
    const isDifferentEpisode = mediaType === 'tv' && (
      (party.season !== undefined && Number(party.season) !== Number(numSeason)) ||
      (party.episode !== undefined && Number(party.episode) !== Number(numEpisode))
    );

    const broadcastKey = `${numId}-${mediaType}-${numSeason || 0}-${numEpisode || 0}`;

    if ((isDifferentMedia || isDifferentType || isDifferentEpisode) && lastBroadcastKeyRef.current !== broadcastKey) {
      lastBroadcastKeyRef.current = broadcastKey;
      publishState(
        true, 
        0, 
        true, 
        mediaType === 'tv' ? numSeason : null, 
        mediaType === 'tv' ? numEpisode : null, 
        activeSource?.server_key, 
        'media_change', 
        numId, 
        mediaType, 
        mediaTitle, 
        details.poster_path
      );
    }
  }, [canControl, party?.media_id, party?.media_type, party?.season, party?.episode, numId, type, numSeason, numEpisode, details, partyCode, publishState, activeSource?.server_key]);

  const { 
    initialProgress, 
    isReady: isProgressReady, 
    recordProgress, 
    isNearEnd, 
    isEnded, 
    durationSeconds: progressDuration, 
    advanceToNextEpisode 
  } = useWatchProgress(numId, type || 'movie', numSeason, numEpisode, details);

  // Auto Continue Watching Overlay state
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [autoNextDismissed, setAutoNextDismissed] = useState(false);

  // Reset dismissed state on media or episode change
  useEffect(() => {
    setAutoNextDismissed(false);
    setShowAutoNext(false);
  }, [numId, numSeason, numEpisode]);

  // Trigger auto continue watching overlay when duration threshold is reached
  useEffect(() => {
    if ((isNearEnd || isEnded) && !autoNextDismissed) {
      setShowAutoNext(true);
    }
  }, [isNearEnd, isEnded, autoNextDismissed]);

  // Stable starting progress for embed iframe generation (so ongoing room sync does not reload iframe)
  const [initialStartProgress, setInitialStartProgress] = useState<number | null>(null);

  useEffect(() => {
    // Reset starting progress when media, season, or episode changes
    setInitialStartProgress(null);
  }, [numId, numSeason, numEpisode]);

  useEffect(() => {
    if (initialStartProgress === null) {
      if (!isHost && party && party.position_seconds !== undefined && party.position_seconds > 0) {
        const exactPos = expectedHostPosition();
        setInitialStartProgress(exactPos);
        setResyncProgress(exactPos);
      } else if (isProgressReady && initialProgress > 0) {
        setInitialStartProgress(initialProgress);
      }
    }
  }, [isHost, party?.position_seconds, isProgressReady, initialProgress, initialStartProgress, expectedHostPosition]);

  const embedUrl = useMemo(() => {
    if (!activeSource || !isProgressReady) return '';
    const serverConf = SERVERS[activeSource.server_key];
    if (serverConf) {
      return serverConf.buildUrl({
        type: type || 'movie',
        id: numId,
        season: numSeason,
        episode: numEpisode,
        progress: initialStartProgress !== null ? initialStartProgress : initialProgress,
        source: activeSource.source,
        retryCount
      });
    }
    return '';
  }, [activeSource, type, numId, numSeason, numEpisode, isProgressReady, retryCount, initialStartProgress, initialProgress]);

  const [hostServerWarning, setHostServerWarning] = useState('');
  useEffect(() => {
    if (!isHost && party?.server_key && activeSource?.server_key) {
      if (party.server_key !== activeSource.server_key) {
        const matching = sources.find(s => s.server_key === party.server_key);
        if (matching) {
          setActiveSource(matching);
        } else {
          setHostServerWarning(prev => {
            const msg = `Host is on ${SERVERS[party.server_key]?.label || 'another server'}, which is unavailable to you.`;
            return prev === msg ? prev : msg;
          });
        }
      } else {
        setHostServerWarning(prev => prev ? '' : prev);
      }
    }
  }, [party?.server_key, isHost, sources, activeSource?.server_key, setActiveSource]);

  // Synchronize server_key to watch party state if Host changes the streaming server/source
  useEffect(() => {
    if (isHost && party && activeSource?.server_key && partyCode) {
      if (activeSource.server_key !== party.server_key) {
        const currentPos = expectedHostPosition();
        const runtimeSeconds = details?.runtime ? details.runtime * 60 : null;
        publishState(
          !hostPaused, 
          currentPos, 
          true, 
          numSeason, 
          numEpisode, 
          activeSource.server_key, 
          'server',
          null,
          null,
          null,
          null,
          runtimeSeconds
        );
      }
    }
  }, [isHost, activeSource?.server_key, party?.server_key, numSeason, numEpisode, hostPaused, partyCode, publishState, expectedHostPosition, details?.runtime]);

  useEffect(() => {
    if (!partyCode || !isConnected) return;
    const interval = setInterval(() => {
      let currentStatus: 'synced' | 'buffering' | 'desynced' | 'paused' = 'synced';
      if (hostPaused) {
        currentStatus = 'paused';
      } else if (driftSeconds > 5) {
        currentStatus = 'desynced';
      }
      sendMemberStatus(currentStatus, undefined, driftSeconds);
    }, 4000);
    return () => clearInterval(interval);
  }, [partyCode, isConnected, hostPaused, driftSeconds, sendMemberStatus]);

  useEffect(() => {
    if (!id || !type) return;
    let mounted = true;
    setLoadingDetails(true);
    
    const fetchData = async () => {
      try {
        const res = await api.getDetails(type as 'movie' | 'tv', numId);
        if (mounted) {
          setDetails(res.data);
          addRecentlyWatched(res.data);
          setCast(res.data.credits?.cast || []);
          const similarItems = [...(res.data.similar?.results || []), ...(res.data.recommendations?.results || [])];
          setSimilar(Array.from(new Map(similarItems.map(item => [item.id, item])).values()));
          document.title = `Watching: ${res.data.title || res.data.name} — MondoFlix`;
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoadingDetails(false);
      }
    };
    
    fetchData();
    return () => { 
      mounted = false; 
      document.title = 'MondoFlix'; 
    };
  }, [id, type, numId]);

  const handleNextEpisode = useCallback(() => {
    if (type === 'tv' && details) {
      let nextS = numSeason;
      let nextE = numEpisode + 1;

      const currentSeason = details.seasons?.find(s => s.season_number === numSeason);
      if (currentSeason && numEpisode < currentSeason.episode_count) {
        nextS = numSeason;
        nextE = numEpisode + 1;
      } else if (details.seasons && numSeason < details.seasons.length) {
        nextS = numSeason + 1;
        nextE = 1;
      } else {
        return; // No next episode exists
      }

      const activePartyCode = partyCode || sessionStorage.getItem('active_party_code');
      const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
      const targetUrl = `/watch/tv/${id}/season/${nextS}/episode/${nextE}${partyQuery}`;

      // If user is host or granted user in watch party, broadcast new episode to all participants
      const myIdentity = getUserIdentity();
      const canControl = isHost || !onlyHostControls || (controlGrantedTo && String(controlGrantedTo) === String(myIdentity.id));
      if (activePartyCode && canControl) {
        publishState(
          true,
          0,
          true,
          nextS,
          nextE,
          activeSource?.server_key,
          'media_change',
          numId,
          'tv',
          details.title || details.name,
          details.poster_path
        );
      }

      // Automatically advance Continue Watching record to next episode
      advanceToNextEpisode(details, nextS, nextE);

      setShowAutoNext(false);
      setAutoNextDismissed(false);
      navigate(targetUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [type, details, numSeason, numEpisode, partyCode, isHost, publishState, activeSource?.server_key, numId, id, advanceToNextEpisode, navigate]);

  const handlePrevEpisode = useCallback(() => {
    if (type === 'tv' && details) {
      if (numEpisode > 1) {
        navigate(`/watch/tv/${id}/season/${numSeason}/episode/${numEpisode - 1}`);
      } else if (numSeason > 1) {
        const prevSeason = details.seasons?.find(s => s.season_number === numSeason - 1);
        if (prevSeason) {
          navigate(`/watch/tv/${id}/season/${numSeason - 1}/episode/${prevSeason.episode_count}`);
        }
      }
    }
  }, [type, details, numEpisode, numSeason, id, navigate]);

  const handleReplay = useCallback(() => {
    setResyncProgress(0);
    recordProgress(0, progressDuration || 5400);
    setAutoNextDismissed(true);
    setShowAutoNext(false);
  }, [recordProgress, progressDuration]);

  const handleSelectSimilarMedia = useCallback((sim: Media) => {
    const simType = sim.media_type || 'movie';
    const activePartyCode = partyCode || sessionStorage.getItem('active_party_code');
    const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
    navigate(`/watch/${simType}/${sim.id}${partyQuery}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [partyCode, navigate]);

  return (
    <div className="min-h-screen bg-[#050A14] flex flex-col font-sans selection:bg-[#00F5FF]/30">
      <PlayerHeader 
        mediaDetails={details}
        season={numSeason}
        episode={numEpisode}
        isIdle={isIdle}
        partyCode={partyCode}
        membersCount={members.length}
        driftSeconds={driftSeconds}
        hostPaused={hostPaused}
        isHost={isHost}
        onlyHostControls={onlyHostControls}
        onResync={() => forceResync()}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onExitParty={handleExitParty}
        onEndParty={handleEndParty}
        onRequestControl={requestControl}
        isControlRequestPending={myControlRequestPending}
        onTogglePause={togglePause}
        durationSeconds={party?.duration_seconds}
      />
      
      <div className="pt-16 flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="w-full flex flex-col relative">
            {isProgressReady && embedUrl && (
              <>
                <VideoPlayer 
                  embedUrl={embedUrl}
                  activeSource={activeSource}
                  sources={sources}
                  onSelectSource={setActiveSource}
                  onNextServer={nextSource}
                  backdropPath={details?.backdrop_path}
                  isIdle={isIdle}
                  title={details?.title || details?.name || ''}
                  retryCount={retryCount}
                  onRetry={() => setRetryCount(c => c + 1)}
                  onPrevEpisode={handlePrevEpisode}
                  onNextEpisode={handleNextEpisode}
                  seekTarget={resyncProgress}
                  onAdapterReady={(adapter) => {
                    playerAdapterRef.current = adapter;
                  }}
                  isHost={isHost}
                  onlyHostControls={onlyHostControls}
                  canControl={canControl}
                  partyCode={partyCode}
                  hostPaused={hostPaused}
                  onRequestControl={requestControl}
                  isControlRequestPending={myControlRequestPending}
                  pendingControlRequests={controlRequests}
                  onGrantControl={grantControl}
                  onDeclineControl={declineControl}
                  controlFeedback={controlFeedback}
                  onDismissFeedback={clearControlFeedback}
                  onPlayerEvent={(evt) => {
                    const myIdentity = getUserIdentity();
                    const canControl = isHost || !onlyHostControls || (controlGrantedTo && String(controlGrantedTo) === String(myIdentity.id));
                    const durationFromEvent = evt.duration || evt.duration_seconds;
                    const runtimeInSeconds = details?.runtime ? details.runtime * 60 : null;
                    const finalDuration = durationFromEvent || runtimeInSeconds || progressDuration || 5400;

                    // Automatically record and sync Continue Watching progress as duration advances
                    if (evt.currentTime !== undefined) {
                      recordProgress(evt.currentTime, finalDuration, evt.type === 'ended');
                    }

                    if (canControl) {
                      if (evt.type === 'pause') {
                        publishState(false, evt.currentTime, true, numSeason, numEpisode, activeSource?.server_key, 'pause', null, null, null, null, finalDuration);
                      } else if (evt.type === 'play') {
                        publishState(true, evt.currentTime, true, numSeason, numEpisode, activeSource?.server_key, 'play', null, null, null, null, finalDuration);
                      } else if (evt.type === 'seeked' || evt.type === 'seeking') {
                        publishState(!hostPaused, evt.currentTime, true, numSeason, numEpisode, activeSource?.server_key, 'seek', null, null, null, null, finalDuration);
                      } else if (evt.type === 'timeupdate') {
                        if (!hostPaused) {
                          publishState(true, evt.currentTime, false, numSeason, numEpisode, activeSource?.server_key, 'play', null, null, null, null, finalDuration);
                        }
                      }
                    } else {
                      if (evt.type === 'timeupdate' && !hostPaused) {
                         checkDrift(evt.currentTime);
                      } else if (evt.type === 'pause' && !hostPaused) {
                         // Host is playing, but viewer paused locally: automatically resync and continue playback
                         playerAdapterRef.current?.play();
                      } else if ((evt.type === 'seeked' || evt.type === 'seeking') && onlyHostControls) {
                         // Viewer attempted local seek while host controls: pull back to host position only if drift > 2s
                         const expected = expectedHostPosition();
                         if (Math.abs(evt.currentTime - expected) > 2.0) {
                           setResyncProgress(expected);
                           playerAdapterRef.current?.seek(expected);
                         }
                      }
                    }

                    // Transmit participant status indicators (buffering, synced, desynced, paused)
                    if (evt.type === 'waiting' || evt.type === 'buffering') {
                      sendMemberStatus('buffering', evt.currentTime, driftSeconds);
                    } else if (evt.type === 'pause' || hostPaused) {
                      sendMemberStatus('paused', evt.currentTime, driftSeconds);
                    } else if (evt.type === 'play' || evt.type === 'timeupdate' || evt.type === 'seeked') {
                      const myStatus = driftSeconds > 3 ? 'desynced' : 'synced';
                      sendMemberStatus(myStatus, evt.currentTime, driftSeconds);
                    }
                  }}
                />
                <FloatingReactions reactions={floatingReactions} />
                <AutoNextOverlay
                  isOpen={showAutoNext && !hostPaused}
                  mediaType={(type === 'tv' ? 'tv' : 'movie')}
                  mediaDetails={details}
                  currentSeason={numSeason}
                  currentEpisode={numEpisode}
                  onNextEpisode={handleNextEpisode}
                  onPrevEpisode={handlePrevEpisode}
                  onReplay={handleReplay}
                  onCancel={() => {
                    setShowAutoNext(false);
                    setAutoNextDismissed(true);
                  }}
                  partyCode={partyCode}
                  isHost={isHost}
                  onlyHostControls={onlyHostControls}
                  similarMedia={similar}
                  onSelectMedia={handleSelectSimilarMedia}
                />
                {/* Guest/Member Paused Overlay (Only shown to members who do not control playback) */}
                {hostPaused && !canControl && (
                  <HostPausedOverlay 
                    onResync={() => {
                      forceResync();
                    }} 
                    onRequestControl={requestControl}
                    isControlRequestPending={myControlRequestPending}
                    onTogglePause={togglePause}
                    canControl={false}
                  />
                )}
                {/* Non-intrusive Host Pause HUD Pill so host player is NEVER locked or obstructed */}
                {hostPaused && canControl && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-[#070D18]/95 border border-amber-500/40 text-white px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl pointer-events-auto"
                  >
                    <span className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Paused for Room
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => togglePause()}
                      className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs rounded-full flex items-center gap-1 shadow-md cursor-pointer transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume Playback</span>
                    </motion.button>
                  </motion.div>
                )}
                {hostServerWarning && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-full font-bold shadow-lg z-50">
                    {hostServerWarning}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Watch Party Navigation Tabs (Only when Party is active on mobile) */}
          {partyCode && (
            <div className="md:hidden flex items-center border-b border-white/10 bg-[#080E1A]/95 backdrop-blur-md sticky top-16 z-30 p-1.5 gap-1">
              <button
                onClick={() => setMobilePartyTab('chat')}
                className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl transition-colors relative z-10 cursor-pointer ${
                  mobilePartyTab === 'chat'
                    ? "text-cyan-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {mobilePartyTab === 'chat' && (
                  <motion.div
                    layoutId="mobile-party-nav-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl -z-10 shadow-sm"
                  />
                )}
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat ({messages.length})</span>
              </button>
              <button
                onClick={() => setMobilePartyTab('details')}
                className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl transition-colors relative z-10 cursor-pointer ${
                  mobilePartyTab === 'details'
                    ? "text-cyan-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {mobilePartyTab === 'details' && (
                  <motion.div
                    layoutId="mobile-party-nav-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl -z-10 shadow-sm"
                  />
                )}
                <Info className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              {type === 'tv' && (
                <button
                  onClick={() => setMobilePartyTab('episodes')}
                  className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl transition-colors relative z-10 cursor-pointer ${
                    mobilePartyTab === 'episodes'
                      ? "text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {mobilePartyTab === 'episodes' && (
                    <motion.div
                      layoutId="mobile-party-nav-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl -z-10 shadow-sm"
                    />
                  )}
                  <ListVideo className="w-3.5 h-3.5" />
                  <span>Episodes</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile Active Party Panel (Embedded immediately below video player on mobile when 'chat' tab is active) */}
          {partyCode && mobilePartyTab === 'chat' && (
            <div className="md:hidden w-full h-[480px] bg-[#050A14] border-b border-white/10 overflow-hidden">
              <WatchPartySidebar 
                media={details}
                season={numSeason}
                episode={numEpisode}
                party={party}
                partyCode={partyCode}
                members={members}
                messages={messages}
                isHost={isHost}
                driftSeconds={driftSeconds}
                hostPaused={hostPaused}
                userAvatar={userAvatar}
                userColor={userColor}
                typingUsers={typingUsers}
                onlyHostControls={onlyHostControls}
                onRequestControl={requestControl}
                isControlRequestPending={myControlRequestPending}
                controlRequests={controlRequests}
                onGrantControl={grantControl}
                onDeclineControl={declineControl}
                controlFeedback={controlFeedback}
                onDismissFeedback={clearControlFeedback}
                onSendMessage={sendChatMessage}
                onSendReaction={sendReaction}
                onSendTyping={sendTyping}
                onResync={() => forceResync()}
                onKickMember={kickMember}
                onUpdateSettings={updatePartySettings}
                onTransferHost={transferHost}
                onSetAvatar={setUserAvatar}
                onSetColor={setUserColor}
                onLeave={handleExitParty}
                onEndParty={handleEndParty}
                onPartyCreated={(code) => {
                  let targetUrl = `/watch/${type || 'movie'}/${numId}`;
                  if (type === 'tv' && numSeason && numEpisode) {
                    targetUrl += `/season/${numSeason}/episode/${numEpisode}`;
                  }
                  targetUrl += `?party=${code}`;
                  navigate(targetUrl);
                }}
              />
            </div>
          )}

          {/* Details & Episodes & Recommendations */}
          <div className={partyCode && mobilePartyTab === 'chat' ? "hidden md:block" : "block"}>
            {loadingDetails ? (
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
                <div className="flex gap-8">
                  <div className="hidden md:block w-52 h-[312px] bg-slate-800 rounded-xl animate-pulse" />
                  <div className="flex-1 space-y-4">
                    <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
                    <div className="h-12 w-2/3 bg-slate-800 rounded animate-pulse" />
                    <div className="h-24 w-full bg-slate-800 rounded animate-pulse mt-8" />
                  </div>
                </div>
              </div>
            ) : details ? (
              <>
                <div className={partyCode && mobilePartyTab === 'episodes' ? "hidden md:block" : "block"}>
                  <MediaDetails details={details} type={type as 'movie' | 'tv'} cast={cast} />
                </div>
                
                {type === 'tv' && (
                  <div className={partyCode && mobilePartyTab === 'details' ? "hidden md:block" : "block"}>
                    <EpisodesList 
                      tvId={numId}
                      seasons={details.seasons || []}
                      currentSeason={numSeason}
                      currentEpisode={numEpisode}
                      isHost={isHost}
                      onlyHostControls={onlyHostControls}
                      partyCode={partyCode}
                      onRequestControl={requestControl}
                      canControl={isHost || !onlyHostControls || (controlGrantedTo && String(controlGrantedTo) === String(getUserIdentity().id))}
                    />
                  </div>
                )}
                
                {similar.length > 0 && (
                  <div className={`pb-12 ${partyCode && mobilePartyTab === 'episodes' ? "hidden md:block" : "block"}`}>
                    <Row 
                      title="More Like This" 
                      items={similar} 
                      onOpenModal={(m) => {
                        const mType = m.media_type || ((m as any).first_air_date ? 'tv' : 'movie');
                        const activePartyCode = sessionStorage.getItem('active_party_code');
                        const partyQuery = activePartyCode ? `?party=${activePartyCode}` : '';
                        navigate(`/watch/${mType}/${m.id}${partyQuery}`);
                      }}
                    />
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Desktop Sticky Watch Party Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="hidden md:flex flex-col w-80 lg:w-96 border-l border-white/5 bg-[#050A14] flex-shrink-0 z-40 sticky top-16 h-[calc(100vh-64px)] overflow-hidden"
            >
              <WatchPartySidebar 
                media={details}
                season={numSeason}
                episode={numEpisode}
                party={party}
                partyCode={partyCode}
                members={members}
                messages={messages}
                isHost={isHost}
                driftSeconds={driftSeconds}
                hostPaused={hostPaused}
                userAvatar={userAvatar}
                userColor={userColor}
                typingUsers={typingUsers}
                onlyHostControls={onlyHostControls}
                onRequestControl={requestControl}
                isControlRequestPending={myControlRequestPending}
                controlRequests={controlRequests}
                onGrantControl={grantControl}
                onDeclineControl={declineControl}
                controlFeedback={controlFeedback}
                onDismissFeedback={clearControlFeedback}
                onClose={() => setShowSidebar(false)}
                onSendMessage={sendChatMessage}
                onSendReaction={sendReaction}
                onSendTyping={sendTyping}
                onResync={() => forceResync()}
                onKickMember={kickMember}
                onUpdateSettings={updatePartySettings}
                onTransferHost={transferHost}
                onSetAvatar={setUserAvatar}
                onSetColor={setUserColor}
                onLeave={handleExitParty}
                onEndParty={handleEndParty}
                onPartyCreated={(code) => {
                  let targetUrl = `/watch/${type || 'movie'}/${numId}`;
                  if (type === 'tv' && numSeason && numEpisode) {
                    targetUrl += `/season/${numSeason}/episode/${numEpisode}`;
                  }
                  targetUrl += `?party=${code}`;
                  navigate(targetUrl);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Setup / Party Sidebar Drawer when showSidebar is open on mobile and not in room */}
        <AnimatePresence>
          {!partyCode && showSidebar && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end"
            >
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm h-full bg-[#070E1B] shadow-2xl"
              >
                <WatchPartySidebar 
                  media={details}
                  season={numSeason}
                  episode={numEpisode}
                  party={party}
                  partyCode={partyCode}
                  members={members}
                  messages={messages}
                  isHost={isHost}
                  driftSeconds={driftSeconds}
                  hostPaused={hostPaused}
                  userAvatar={userAvatar}
                  userColor={userColor}
                  typingUsers={typingUsers}
                  onlyHostControls={onlyHostControls}
                  onRequestControl={requestControl}
                  isControlRequestPending={myControlRequestPending}
                  controlRequests={controlRequests}
                  onGrantControl={grantControl}
                  onDeclineControl={declineControl}
                  controlFeedback={controlFeedback}
                  onDismissFeedback={clearControlFeedback}
                  onClose={() => setShowSidebar(false)}
                  onSendMessage={sendChatMessage}
                  onSendReaction={sendReaction}
                  onSendTyping={sendTyping}
                  onResync={() => forceResync()}
                  onKickMember={kickMember}
                  onUpdateSettings={updatePartySettings}
                  onTransferHost={transferHost}
                  onSetAvatar={setUserAvatar}
                  onSetColor={setUserColor}
                  onLeave={handleExitParty}
                  onEndParty={handleEndParty}
                  onPartyCreated={(code) => {
                    setShowSidebar(false);
                    let targetUrl = `/watch/${type || 'movie'}/${numId}`;
                    if (type === 'tv' && numSeason && numEpisode) {
                      targetUrl += `/season/${numSeason}/episode/${numEpisode}`;
                    }
                    targetUrl += `?party=${code}`;
                    navigate(targetUrl);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
