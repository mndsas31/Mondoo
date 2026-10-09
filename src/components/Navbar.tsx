import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, Settings, LogOut, ChevronDown, Check, Users, Copy, X, Home, Tv, Film, Flame, Bookmark, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
          <Link 
            to="/" 
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:scale-105 transition-transform flex items-center cursor-pointer" 
            title="MondoFlix - Go to Home Page"
          >
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

        {/* Center: Desktop Centered Navigation Links with Motion layout indicator */}
        <div className="hidden md:flex items-center justify-center gap-6 lg:gap-8 text-sm font-medium text-slate-300 absolute left-1/2 -translate-x-1/2">
          {[
            { path: '/', label: 'Home' },
            { path: '/series', label: 'Series' },
            { path: '/films', label: 'Films' },
            { path: '/new-and-popular', label: 'New & Popular' },
          ].map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={cn(
                  "relative py-1 transition-colors whitespace-nowrap",
                  isActive ? "text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
          
          <button 
            onClick={() => handleAuthAction(() => setMyListOpen(true))} 
            className="relative py-1 text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            My List
          </button>

          {activePartyCode ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950/90 to-indigo-950/90 py-1 pl-3 pr-2 rounded-full border border-cyan-400/50 shadow-[0_0_20px_rgba(0,245,255,0.25)]"
            >
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
            </motion.div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleAuthAction(() => setWatchPartyOpen(true))} 
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors bg-cyan-500/10 px-3.5 py-1.5 rounded-full border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-[0_0_15px_rgba(0,245,255,0.15)] whitespace-nowrap cursor-pointer text-xs"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Watch Party
            </motion.button>
          )}
        </div>

        {/* Right: Search, Messages, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-white">
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-slate-800/60 transition-colors touch-manipulation cursor-pointer border border-transparent hover:border-white/10"
            title="Search movies and series"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 hover:text-cyan-400 transition-colors" />
          </motion.button>

          {/* Direct Messages & Friends */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setDmOpen(true)}
            className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-slate-800/60 transition-colors touch-manipulation cursor-pointer border border-transparent hover:border-white/10"
            title="Friends & Direct Messages"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 hover:text-cyan-400 transition-colors" />
          </motion.button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <motion.button 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAuthAction(() => setShowNotifications(!showNotifications))}
              className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-slate-800/60 transition-colors touch-manipulation cursor-pointer border border-transparent hover:border-white/10"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 hover:text-cyan-400 cursor-pointer transition-colors" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full ring-2 ring-[#0A1428] shadow-[0_0_8px_#22d3ee]"></span>
              )}
            </motion.button>
            
            <AnimatePresence>
              {showNotifications && user && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="fixed sm:absolute top-14 sm:top-12 left-4 right-4 sm:left-auto sm:right-0 sm:w-80 bg-slate-900/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] sm:max-h-[400px] z-50"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                    <h3 className="font-semibold text-white text-sm">Notifications</h3>
                    {notifications.some(n => !n.is_read) && (
                      <button onClick={markAllAsRead} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer">
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
                              "p-4 border-b border-white/5 hover:bg-white/[0.04] transition-colors flex gap-3 cursor-pointer",
                              !notif.is_read ? "bg-cyan-500/[0.06]" : ""
                            )}
                            onClick={() => markAsRead(notif.id)}
                          >
                            {!notif.is_read && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0 shadow-[0_0_6px_#22d3ee]"></div>}
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

                              <span className="text-[10px] text-slate-500 mt-2 block font-mono">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 cursor-pointer touch-manipulation"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-violet-600 rounded-full shadow-md flex items-center justify-center font-bold text-xs text-black">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </motion.div>
              
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="absolute right-0 top-11 w-48 bg-slate-900/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 hover:bg-white/5 flex items-center gap-3 text-sm text-slate-200">
                      <User className="w-4 h-4 text-cyan-400" /> {user.username}
                    </div>
                    <div 
                      className="px-4 py-2 hover:bg-white/5 flex items-center gap-3 text-sm text-slate-200 cursor-pointer" 
                      onClick={() => { setUserMenuOpen(false); openSettingsModal(); }}
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Settings
                    </div>
                    <div className="border-t border-white/10 my-1"></div>
                    <div 
                      className="px-4 py-2 hover:bg-white/5 flex items-center gap-3 text-sm text-rose-400 cursor-pointer" 
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAuthModal}
              className="bg-gradient-to-r from-cyan-400 to-violet-600 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-black font-extrabold px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-300 touch-manipulation cursor-pointer"
            >
              Sign In
            </motion.button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070D18]/90 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl">
        {[
          { path: '/', label: 'Home', icon: Home },
          { path: '/series', label: 'Series', icon: Tv },
          { path: '/films', label: 'Films', icon: Film },
          { path: '/new-and-popular', label: 'Popular', icon: Flame },
        ].map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <Link 
              key={tab.path}
              to={tab.path} 
              className={cn(
                "relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors touch-manipulation",
                isActive ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110 text-cyan-400" : "")} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -bottom-0.5 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee]"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
            </Link>
          );
        })}
        <button 
          onClick={() => handleAuthAction(() => setMyListOpen(true))}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold text-slate-400 hover:text-white transition-colors touch-manipulation cursor-pointer active:scale-95"
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
