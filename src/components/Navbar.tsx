import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, Settings, LogOut, ChevronDown, Check, Users, Copy, X, Home, Tv, Film, Flame, Bookmark, MessageSquare } from 'lucide-react';
import { cn } from '../utils/cn';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { SearchModal } from './SearchModal';
import { MyListModal } from './MyListModal';
import { WatchPartyModal } from './party/WatchPartyModal';
import { DirectMessageModal } from './DirectMessageModal';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [myListOpen, setMyListOpen] = useState(false);
  const [watchPartyOpen, setWatchPartyOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [navbarCopied, setNavbarCopied] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, openAuthModal, logout, openSettingsModal } = useAuth();

  const activePartyCode = new URLSearchParams(location.search).get('party') || sessionStorage.getItem('active_party_code');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/notifications');
      if (data && data.items) {
        setNotifications(data.items);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user, token]);

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await apiFetch(`/notifications/read-all`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuthAction = (action: () => void) => {
    if (!user) {
      openAuthModal();
    } else {
      action();
    }
  };

  if (location.pathname.startsWith('/watch')) return null;

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 w-full z-50 transition-all duration-300 px-3 sm:px-6 md:px-12 lg:px-20 py-3 sm:py-4 flex items-center justify-between',
          isScrolled ? 'bg-[#0A1428]/95 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-white/5' : 'bg-gradient-to-b from-black/85 via-black/50 to-transparent'
        )}
      >
        {/* Left: Brand Logo & Mobile Party Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/" className="hover:scale-105 transition-transform flex items-center">
            <Logo className="h-7 sm:h-8 md:h-10" />
          </Link>

          {/* Mobile active party pill in top bar */}
          {activePartyCode && (
            <div className="md:hidden flex items-center gap-1 bg-cyan-950/90 border border-cyan-500/50 py-0.5 px-2 rounded-full text-[10px] font-bold text-white shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-cyan-300">{activePartyCode}</span>
            </div>
          )}
        </div>

        {/* Center: Desktop Centered Navigation Links */}
        <div className="hidden md:flex items-center justify-center gap-5 lg:gap-7 text-sm font-medium text-slate-300 absolute left-1/2 -translate-x-1/2">
          <Link to="/" className={cn("hover:text-cyan-400 transition-colors", location.pathname === '/' && "text-cyan-400 font-bold")}>Home</Link>
          <Link to="/series" className={cn("hover:text-cyan-400 transition-colors", location.pathname === '/series' && "text-cyan-400 font-bold")}>Series</Link>
          <Link to="/films" className={cn("hover:text-cyan-400 transition-colors", location.pathname === '/films' && "text-cyan-400 font-bold")}>Films</Link>
          <Link to="/new-and-popular" className={cn("hover:text-cyan-400 transition-colors", location.pathname === '/new-and-popular' && "text-cyan-400 font-bold")}>New & Popular</Link>
          <button onClick={() => handleAuthAction(() => setMyListOpen(true))} className="hover:text-cyan-400 transition-colors whitespace-nowrap">My List</button>
          {activePartyCode ? (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950/90 to-indigo-950/90 py-1 pl-3 pr-2 rounded-full border border-cyan-400/50 shadow-[0_0_20px_rgba(0,245,255,0.25)]">
              <button 
                onClick={() => handleAuthAction(() => setWatchPartyOpen(true))} 
                className="flex items-center gap-1.5 text-cyan-300 hover:text-white font-bold text-xs cursor-pointer"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider">Party:</span>
                <span className="font-mono tracking-wider text-white font-black">{activePartyCode}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(activePartyCode);
                  setNavbarCopied(true);
                  setTimeout(() => setNavbarCopied(false), 2000);
                }}
                className="p-1 hover:bg-cyan-500/20 text-cyan-300 rounded-full transition-colors ml-0.5"
                title="Copy Party Code"
              >
                {navbarCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sessionStorage.removeItem('active_party_code');
                  const url = new URL(window.location.href);
                  url.searchParams.delete('party');
                  if (location.pathname.startsWith('/watch')) {
                    navigate(url.pathname + url.search);
                  } else {
                    navigate(location.pathname);
                  }
                }}
                className="p-1 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 rounded-full transition-colors ml-0.5 border border-rose-500/30"
                title="Exit Watch Party Mode"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => handleAuthAction(() => setWatchPartyOpen(true))} 
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors bg-cyan-500/10 px-3.5 py-1.5 rounded-full border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-[0_0_15px_rgba(0,245,255,0.15)] whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Watch Party
            </button>
          )}
        </div>

        {/* Right: Search, Messages, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 text-white">
          <button 
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-slate-800 transition-colors touch-manipulation cursor-pointer"
            title="Search movies and series"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 hover:text-cyan-400 transition-colors" />
          </button>

          {/* Direct Messages & Friends */}
          <button
            onClick={() => setDmOpen(true)}
            className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-slate-800 transition-colors touch-manipulation cursor-pointer"
            title="Friends & Direct Messages"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 hover:text-cyan-400 transition-colors" />
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button 
              onClick={() => handleAuthAction(() => setShowNotifications(!showNotifications))}
              className="relative p-2 touch-manipulation"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 hover:text-cyan-400 cursor-pointer transition-colors" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A1428]"></span>
              )}
            </button>
            
            {showNotifications && user && (
              <div className="fixed sm:absolute top-14 sm:top-12 left-4 right-4 sm:left-auto sm:right-0 sm:w-80 bg-slate-900/98 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] sm:max-h-[400px] z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <h3 className="font-bold text-white text-sm">Notifications</h3>
                  {notifications.some(n => !n.is_read) && (
                    <button onClick={markAllAsRead} className="text-xs text-cyan-400 hover:text-cyan-300">
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notif => {
                      const codeMatch = notif.message.match(/Join room:\s*([A-Z0-9]{6})/i) || notif.message.match(/room:\s*([A-Z0-9]{6})/i) || notif.message.match(/Code:\s*([A-Z0-9]{6})/i);
                      const roomCode = codeMatch ? codeMatch[1].toUpperCase() : null;

                      return (
                        <div 
                          key={notif.id} 
                          className={cn(
                            "p-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors flex gap-3 cursor-pointer",
                            !notif.is_read ? "bg-slate-800/30" : ""
                          )}
                          onClick={() => markAsRead(notif.id)}
                        >
                          {!notif.is_read && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>}
                          <div className="flex-1 min-w-0">
                            <h4 className={cn("text-sm mb-1 truncate", !notif.is_read ? "font-bold text-white" : "font-medium text-slate-300")}>{notif.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed break-words">{notif.message}</p>
                            
                            {roomCode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notif.id);
                                  setShowNotifications(false);
                                  navigate(`/watch?party=${roomCode}`);
                                }}
                                className="mt-2.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-[11px] rounded-lg shadow-[0_0_12px_rgba(0,245,255,0.3)] transition-all cursor-pointer flex items-center gap-1 w-fit"
                              >
                                <Users className="w-3.5 h-3.5 animate-pulse" />
                                <span>Join Watch Party</span>
                              </button>
                            )}

                            <span className="text-[10px] text-slate-500 mt-2 block">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">No new notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <div 
                className="flex items-center gap-1.5 cursor-pointer touch-manipulation"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[#00F5FF] to-[#8B5CF6] rounded-full shadow-md flex items-center justify-center font-bold text-xs text-black">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-48 bg-slate-900/98 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 hover:bg-white/5 flex items-center gap-3 text-sm text-slate-200">
                    <User className="w-4 h-4 text-cyan-400" /> {user.username}
                  </div>
                  <div 
                    className="px-4 py-2 hover:bg-white/5 flex items-center gap-3 text-sm text-slate-200 cursor-pointer" 
                    onClick={() => { setUserMenuOpen(false); openSettingsModal(); }}
                  >
                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                  </div>
                  <div className="border-t border-slate-800 my-1"></div>
                  <div 
                    className="px-4 py-2 hover:bg-white/5 flex items-center gap-3 text-sm text-rose-400 cursor-pointer" 
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={openAuthModal}
              className="bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] hover:shadow-[0_0_15px_rgba(0,245,255,0.4)] text-black font-bold px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-300 touch-manipulation"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070D18]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl">
        <Link 
          to="/" 
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors touch-manipulation",
            location.pathname === '/' ? "text-[#00F5FF]" : "text-slate-400 hover:text-white"
          )}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link 
          to="/series" 
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors touch-manipulation",
            location.pathname === '/series' ? "text-[#00F5FF]" : "text-slate-400 hover:text-white"
          )}
        >
          <Tv className="w-5 h-5" />
          <span>Series</span>
        </Link>
        <Link 
          to="/films" 
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors touch-manipulation",
            location.pathname === '/films' ? "text-[#00F5FF]" : "text-slate-400 hover:text-white"
          )}
        >
          <Film className="w-5 h-5" />
          <span>Films</span>
        </Link>
        <Link 
          to="/new-and-popular" 
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors touch-manipulation",
            location.pathname === '/new-and-popular' ? "text-[#00F5FF]" : "text-slate-400 hover:text-white"
          )}
        >
          <Flame className="w-5 h-5" />
          <span>Popular</span>
        </Link>
        <button 
          onClick={() => handleAuthAction(() => setMyListOpen(true))}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white transition-colors touch-manipulation"
        >
          <Bookmark className="w-5 h-5" />
          <span>My List</span>
        </button>
      </div>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <MyListModal isOpen={myListOpen} onClose={() => setMyListOpen(false)} />
      <WatchPartyModal isOpen={watchPartyOpen} onClose={() => setWatchPartyOpen(false)} />
      <DirectMessageModal isOpen={dmOpen} onClose={() => setDmOpen(false)} />
    </>
  );
};
