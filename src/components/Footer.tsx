import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/watch')) return null;

  return (
    <footer className="border-t border-white/5 bg-[#030712] mt-20 text-slate-400 text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <Logo />
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <a href="#facebook" className="hover:text-cyan-400 transition-colors">Facebook</a>
            <a href="#instagram" className="hover:text-cyan-400 transition-colors">Instagram</a>
            <a href="#x" className="hover:text-cyan-400 transition-colors">X / Twitter</a>
            <a href="#youtube" className="hover:text-cyan-400 transition-colors">YouTube</a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-xs leading-relaxed text-slate-400">
          <div className="flex flex-col gap-3">
            <span className="text-white font-semibold mb-1">Navigation</span>
            <a href="/" className="hover:text-cyan-400 transition-colors">Home</a>
            <a href="/series" className="hover:text-cyan-400 transition-colors">Series</a>
            <a href="/films" className="hover:text-cyan-400 transition-colors">Films</a>
            <a href="/new-and-popular" className="hover:text-cyan-400 transition-colors">New & Popular</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-white font-semibold mb-1">Experience</span>
            <span className="hover:text-slate-200 cursor-pointer">Watch Parties</span>
            <span className="hover:text-slate-200 cursor-pointer">Synced Playback</span>
            <span className="hover:text-slate-200 cursor-pointer">Audio Descriptions</span>
            <span className="hover:text-slate-200 cursor-pointer">Subtitles & CC</span>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-white font-semibold mb-1">Support</span>
            <span className="hover:text-slate-200 cursor-pointer">Help Center</span>
            <span className="hover:text-slate-200 cursor-pointer">Supported Devices</span>
            <span className="hover:text-slate-200 cursor-pointer">Connection Speed</span>
            <span className="hover:text-slate-200 cursor-pointer">Contact Us</span>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-white font-semibold mb-1">Legal</span>
            <span className="hover:text-slate-200 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-200 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-200 cursor-pointer">Cookie Preferences</span>
            <span className="hover:text-slate-200 cursor-pointer">Corporate Information</span>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} MondoFlix Entertainment Inc. All rights reserved.</p>
          <p className="text-slate-400">Powered by TMDB API & VidLink</p>
        </div>
      </div>
    </footer>
  );
};
