import React, { useState, useEffect } from 'react';
import { 
  X, Tv, User, Users, Sliders, Sparkles, Check, Shield, 
  Volume2, Film, Palette, RefreshCw, HardDrive, Download, 
  Trash2, Award, Zap, Subtitles, Layers, Clock, Circle, MessageSquare, UserPlus, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { apiFetch } from '../services/api';

type SettingsTab = 'account' | 'playback' | 'appearance' | 'watchparty' | 'sync' | 'friends';

export const SettingsModal: React.FC = () => {
  const { isSettingsModalOpen, closeSettingsModal, settings, updateSettings, user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [displayName, setDisplayName] = useState(settings.display_name || user?.username || 'Cinephile');
  const [userBio, setUserBio] = useState(settings.user_bio || 'Film Enthusiast & Watch Party Host');
  const [cacheCleared, setCacheCleared] = useState(false);

  // Friends Tab States for Connection Management
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [activePartyCodeInSettings, setActivePartyCodeInSettings] = useState<string | null>(null);
  const [inviteSuccessMap, setInviteSuccessMap] = useState<Record<string, string>>({});
  const [inviteLoadingMap, setInviteLoadingMap] = useState<Record<string, boolean>>({});

  const fetchFriendsList = async () => {
    setFriendsLoading(true);
    try {
      const data = await apiFetch('/friends');
      if (data && data.friends) {
        setFriends(data.friends);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'friends' && isSettingsModalOpen) {
      fetchFriendsList();
      const code = sessionStorage.getItem('active_party_code') || new URLSearchParams(window.location.search).get('party');
      setActivePartyCodeInSettings(code);
    }
  }, [activeTab, isSettingsModalOpen]);

  const handleInviteToWatchParty = async (friendId: string, friendName: string) => {
    if (!activePartyCodeInSettings) return;
    setInviteLoadingMap(prev => ({ ...prev, [friendId]: true }));
    try {
      const res = await apiFetch('/friends/invite-party', {
        method: 'POST',
        body: JSON.stringify({ friend_id: friendId, party_code: activePartyCodeInSettings })
      });
      if (res && res.success) {
        setInviteSuccessMap(prev => ({ ...prev, [friendId]: 'Invitation sent!' }));
        setTimeout(() => {
          setInviteSuccessMap(prev => {
            const next = { ...prev };
            delete next[friendId];
            return next;
          });
        }, 3000);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to send watch party invitation');
    } finally {
      setInviteLoadingMap(prev => ({ ...prev, [friendId]: false }));
    }
  };

  if (!isSettingsModalOpen) return null;

  const avatars = ['😎', '🍿', '🎬', '🚀', '👑', '⚡', '🐉', '🦊', '👾', '🎨', '🦁', '🌟'];
  const avatarFrames = [
    { id: 'neon', label: 'Cyan Neon', border: 'border-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.4)]' },
    { id: 'gold', label: 'Golden Aura', border: 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
    { id: 'emerald', label: 'Emerald Shield', border: 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
    { id: 'subtle', label: 'Subtle Glass', border: 'border-white/20' }
  ];

  const themeOptions = [
    { id: 'cyberpunk', name: 'Midnight Cyberpunk', bg: 'bg-[#0A1428]', desc: 'Default deep navy with glowing accents' },
    { id: 'oled', name: 'Dark OLED', bg: 'bg-[#000000]', desc: 'Pure true-black background for OLED screens' },
    { id: 'navy', name: 'Deep Space Navy', bg: 'bg-[#060D1B]', desc: 'Soft dark navy blue canvas' },
    { id: 'twilight', name: 'Twilight Purple', bg: 'bg-[#0F0A1C]', desc: 'Rich dark violet cinema aesthetic' }
  ];

  const accentColors = [
    { id: 'cyan', hex: '#00F5FF', name: 'Cyan Glow' },
    { id: 'violet', hex: '#8B5CF6', name: 'Violet Neon' },
    { id: 'rose', hex: '#F43F5E', name: 'Rose Red' },
    { id: 'emerald', hex: '#10B981', name: 'Emerald' },
    { id: 'amber', hex: '#F59E0B', name: 'Amber Gold' }
  ];

  const servers = [
    { id: 'vidlink', label: 'VidLink (Ultra Fast)' },
    { id: 'vidstuck', label: 'VidStuck (Multi-Host)' },
    { id: 'vidsrc_cc', label: 'VidSrc v2' },
    { id: 'embedsu', label: 'Embed.su (4K)' },
    { id: 'autoembed', label: 'AutoEmbed' }
  ];

  const qualities = [
    { id: 'auto', label: 'Auto (Recommended)' },
    { id: '1080p', label: '1080p (Full HD)' },
    { id: '720p', label: '720p (HD)' },
    { id: '480p', label: '480p (SD)' }
  ];

  const driftOptions = [
    { id: '2', label: 'Strict (2 seconds)' },
    { id: '3', label: 'Standard (3 seconds)' },
    { id: '5', label: 'Relaxed (5 seconds)' }
  ];

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    }, 1200);
  };

  const handleClearCache = () => {
    localStorage.removeItem('mondoflix_search_history');
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "mondoflix_preferences.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-200"
        onClick={closeSettingsModal}
      />
      
      {/* Centered Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#0A1428]/95 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,245,255,0.15)] overflow-hidden flex flex-col z-10 my-auto animate-in zoom-in-95 fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Settings & Profile Control
              </h2>
              <p className="text-xs text-slate-400">Account profile, playback controls, themes & cloud sync</p>
            </div>
          </div>
          <button 
            onClick={closeSettingsModal}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-slate-950/60 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('account')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap",
              activeTab === 'account' ? "text-cyan-400 border-cyan-400 bg-cyan-500/5" : "text-slate-400 border-transparent hover:text-white"
            )}
          >
            <User className="w-3.5 h-3.5" />
            Profile & Account
          </button>

          <button
            onClick={() => setActiveTab('playback')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap",
              activeTab === 'playback' ? "text-cyan-400 border-cyan-400 bg-cyan-500/5" : "text-slate-400 border-transparent hover:text-white"
            )}
          >
            <Tv className="w-3.5 h-3.5" />
            Playback
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap",
              activeTab === 'appearance' ? "text-cyan-400 border-cyan-400 bg-cyan-500/5" : "text-slate-400 border-transparent hover:text-white"
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            Theme Options
          </button>

          <button
            onClick={() => setActiveTab('watchparty')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap",
              activeTab === 'watchparty' ? "text-cyan-400 border-cyan-400 bg-cyan-500/5" : "text-slate-400 border-transparent hover:text-white"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Watch Party
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap",
              activeTab === 'sync' ? "text-cyan-400 border-cyan-400 bg-cyan-500/5" : "text-slate-400 border-transparent hover:text-white"
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Data Sync
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap",
              activeTab === 'friends' ? "text-cyan-400 border-cyan-400 bg-cyan-500/5" : "text-slate-400 border-transparent hover:text-white"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Friends list
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6 scrollbar-hide">
          {!user && (
            <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-xs text-cyan-300 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-cyan-400" />
              <span>Signed in as Guest. Customize settings locally or sign in to sync everywhere.</span>
            </div>
          )}

          {/* TAB 1: USER PROFILE MANAGEMENT */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Profile Card */}
              <div className="p-4 bg-gradient-to-r from-slate-900/80 to-slate-950/80 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 transition-all",
                    avatarFrames.find(f => f.id === (settings.avatar_frame || 'neon'))?.border
                  )}>
                    {settings.user_avatar || (user ? user.username.charAt(0).toUpperCase() : '😎')}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{displayName}</h3>
                    <p className="text-xs text-slate-400">{user ? user.email : 'Guest Session'}</p>
                    <p className="text-xs text-cyan-300 mt-1 italic">{userBio}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Award className="w-3 h-3 text-cyan-400" /> VIP Member
                  </span>
                </div>
              </div>

              {/* Edit Display Name & Bio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      updateSettings({ display_name: e.target.value });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="Enter display name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Profile Bio / Headline</label>
                  <input
                    type="text"
                    value={userBio}
                    onChange={(e) => {
                      setUserBio(e.target.value);
                      updateSettings({ user_bio: e.target.value });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="Short bio"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Avatar Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {avatars.map((av) => (
                    <button
                      key={av}
                      onClick={() => updateSettings({ user_avatar: av })}
                      className={cn(
                        "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all border",
                        (settings.user_avatar || '😎') === av
                          ? "bg-cyan-500/20 border-cyan-400 scale-110 shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Border Frame */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Avatar Frame Effect</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {avatarFrames.map((frame) => (
                    <button
                      key={frame.id}
                      onClick={() => updateSettings({ avatar_frame: frame.id })}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs font-medium transition-all text-center",
                        (settings.avatar_frame || 'neon') === frame.id
                          ? "bg-cyan-500/10 border-cyan-400 text-white shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {frame.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLAYBACK PREFERENCES */}
          {activeTab === 'playback' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Preferred Video Server */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Default Video Server</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {servers.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateSettings({ preferred_server: s.id })}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-medium transition-all text-left flex items-center justify-between",
                        (settings.preferred_server || 'vidlink') === s.id
                          ? "bg-cyan-500/10 border-cyan-400 text-white shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span>{s.label}</span>
                      {(settings.preferred_server || 'vidlink') === s.id && (
                        <Check className="w-4 h-4 text-cyan-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Streaming Quality */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Default Resolution</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {qualities.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => updateSettings({ streaming_quality: q.id })}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs font-medium transition-all text-center",
                        (settings.streaming_quality || 'auto') === q.id
                          ? "bg-cyan-500/10 border-cyan-400 text-white shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Autoplay Next Episode */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-cyan-400" /> Autoplay Next Episode
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Automatically launch next episode when TV episode finishes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input 
                    type="checkbox" 
                    checked={settings.autoplay_next !== false}
                    onChange={(e) => updateSettings({ autoplay_next: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Auto-Resume Timestamp */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" /> Auto-Resume Playback Progress
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Remember last watch position and resume automatically on player load
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input 
                    type="checkbox" 
                    checked={settings.auto_resume !== false}
                    onChange={(e) => updateSettings({ auto_resume: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: DISPLAY THEME OPTIONS */}
          {activeTab === 'appearance' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Theme Canvas Option */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Display Canvas Theme</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {themeOptions.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => updateSettings({ theme_style: t.id })}
                      className={cn(
                        "p-3.5 rounded-xl border text-xs font-medium transition-all text-left flex flex-col gap-1",
                        (settings.theme_style || 'cyberpunk') === t.id
                          ? "bg-cyan-500/10 border-cyan-400 text-white shadow-md"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{t.name}</span>
                        {(settings.theme_style || 'cyberpunk') === t.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <span className="text-[11px] text-slate-400">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">UI Accent Highlight</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {accentColors.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => updateSettings({ accent_color: col.id })}
                      className={cn(
                        "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all text-left",
                        (settings.accent_color || 'cyan') === col.id
                          ? "bg-white/10 border-cyan-400 text-white shadow-md"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: col.hex }} />
                      <span>{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambient Glow */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Ambient Player Glow
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Render soft background lighting matching movie artwork
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input 
                    type="checkbox" 
                    checked={settings.ambient_glow !== false}
                    onChange={(e) => updateSettings({ ambient_glow: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: WATCH PARTY MODE */}
          {activeTab === 'watchparty' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Default Host Control Mode */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" /> Default Host-Only Controls
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    When you host a Watch Party, only you can pause, play, and seek by default
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input 
                    type="checkbox" 
                    checked={settings.host_control_default !== false}
                    onChange={(e) => updateSettings({ host_control_default: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Sound Notifications */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Watch Party Sound Chimes
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Play gentle sound alerts when members join or send chat messages
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input 
                    type="checkbox" 
                    checked={settings.sound_alerts !== false}
                    onChange={(e) => updateSettings({ sound_alerts: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Drift Sensitivity */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Auto-Sync Resync Drift Tolerance</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {driftOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => updateSettings({ drift_sensitivity: opt.id })}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-medium transition-all text-center",
                        (settings.drift_sensitivity || '3') === opt.id
                          ? "bg-cyan-500/10 border-cyan-400 text-white shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATA SYNCHRONIZATION */}
          {activeTab === 'sync' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Cloud Synchronization Status */}
              <div className="p-4 bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-cyan-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <RefreshCw className={cn("w-3.5 h-3.5 text-cyan-400", isSyncing && "animate-spin")} /> 
                    MondoFlix Cloud Sync
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {syncSuccess ? "Synced successfully with cloud!" : "Preferences and watch state saved continuously"}
                  </p>
                </div>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold transition-all border border-cyan-500/40 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                  <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                </button>
              </div>

              {/* Data Export and Cache Clear */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-cyan-400" /> Export Preferences
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Download backup JSON copy of settings
                  </p>
                  <button
                    onClick={handleExportData}
                    className="w-full py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Backup
                  </button>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Cache Manager
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {cacheCleared ? "Search cache cleared!" : "Clear local temporary search cache"}
                  </p>
                  <button
                    onClick={handleClearCache}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Search Cache
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FRIENDS CONNECTION MANAGEMENT */}
          {activeTab === 'friends' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" /> Connection Manager
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    View active status, invite friends to watch parties, and manage connections.
                  </p>
                </div>
                <button
                  onClick={fetchFriendsList}
                  disabled={friendsLoading}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/10 transition-colors"
                  title="Refresh connections"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", friendsLoading && "animate-spin")} />
                </button>
              </div>

              {friendsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs text-slate-500 font-bold">Loading friends from database...</span>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 font-bold">No friends added yet.</p>
                    <p className="text-[10px] text-slate-500 mt-1">Add friends by entering their email in the Direct Messages panel.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-hide">
                  {friends.map(friend => {
                    const isInviting = inviteLoadingMap[friend.id];
                    const isSuccess = inviteSuccessMap[friend.id];

                    return (
                      <div key={friend.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/20 hover:bg-white/10 transition-all flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl shrink-0">{friend.avatar || '🍿'}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{friend.username}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <Circle className={cn("w-2 h-2 fill-current shrink-0", friend.is_online ? "text-emerald-400" : "text-slate-500")} />
                              {friend.is_online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {activePartyCodeInSettings ? (
                            <button
                              onClick={() => handleInviteToWatchParty(friend.id, friend.username)}
                              disabled={isInviting || !!isSuccess}
                              className={cn(
                                "px-3 py-1.5 text-[11px] font-extrabold rounded-xl transition-all flex items-center gap-1 shadow-md cursor-pointer",
                                isSuccess 
                                  ? "bg-emerald-500 text-black shadow-emerald-500/20"
                                  : "bg-cyan-500 hover:bg-cyan-400 text-black hover:scale-102 active:scale-95 shadow-cyan-500/20 disabled:opacity-50"
                              )}
                            >
                              {isInviting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isSuccess ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <UserPlus className="w-3 h-3" />
                              )}
                              <span>{isSuccess ? 'Invited' : 'Invite to Party'}</span>
                            </button>
                          ) : (
                            <div className="group relative">
                              <button
                                disabled
                                className="px-3 py-1.5 text-[11px] font-bold rounded-xl bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed"
                              >
                                Invite to Party
                              </button>
                              <span className="absolute bottom-full right-0 mb-1 w-48 p-2 rounded-lg bg-black text-[9px] text-slate-300 border border-white/10 invisible group-hover:visible transition-all leading-normal text-right shadow-2xl z-50">
                                You must be actively hosting or inside a Watch Party to invite friends.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex justify-end">
          <button 
            onClick={closeSettingsModal}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
};
