import React, { useState, useEffect, useRef } from 'react';
import { Server, Flag, ShieldAlert, Plus, Check } from 'lucide-react';
import { SERVERS } from '../../utils/servers';
import type { MediaSource } from '../../hooks/useSources';
import { useAuth } from '../../context/AuthContext';
import { sourcesApi } from '../../services/sourcesApi';
import { Link } from 'react-router-dom';

interface ServerButtonProps {
  sources: MediaSource[];
  activeSource: MediaSource | null;
  onSelect: (s: MediaSource) => void;
  compact?: boolean;
}

export const ServerButton: React.FC<ServerButtonProps> = ({ sources, activeSource, onSelect, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, openAuthModal } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setIsOpen(p => !p);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleReport = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!user) return openAuthModal();
    try {
      await sourcesApi.reportSource(id);
      alert('Source reported successfully.');
    } catch (err) { alert('Failed to report source.'); }
  };

  if (!activeSource) return null;

  const currentConf = SERVERS[activeSource.server_key];

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`h-9 sm:h-10 px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 rounded-full transition-all backdrop-blur-md border pointer-events-auto shadow-lg touch-manipulation ${
          isOpen 
            ? 'bg-[#00F5FF]/20 text-[#00F5FF] border-[#00F5FF]/50 shadow-[0_0_15px_rgba(0,245,255,0.2)]' 
            : 'bg-black/70 hover:bg-[#00F5FF]/10 text-white hover:text-[#00F5FF] border-white/10 hover:border-[#00F5FF]/30'
        }`}
        title="Choose streaming server"
      >
        <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00F5FF] shrink-0" />
        <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
          {compact ? (
            <span className="text-[#00F5FF]">{currentConf?.label || activeSource.server_key}</span>
          ) : (
            <>Server: <span className="text-[#00F5FF]">{currentConf?.label || activeSource.server_key}</span></>
          )}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Mobile Backdrop for safe touch dismissal */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Responsive Dropdown Sheet / Panel */}
          <div className="fixed sm:absolute bottom-4 sm:bottom-auto sm:top-12 left-4 right-4 sm:left-auto sm:right-0 sm:w-80 md:w-88 bg-[#0A1428]/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-4 z-50 pointer-events-auto animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5 px-1 shrink-0">
              <div>
                <h3 className="font-bold text-white text-sm">Streaming Servers</h3>
                <p className="text-[11px] text-slate-400">Switch if video buffers or fails to play</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link to="/admin/sources" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium">
                    <Plus className="w-3 h-3"/> Add
                  </Link>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md bg-white/5"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
              {sources.map((src) => {
                const conf = SERVERS[src.server_key];
                if (!conf) return null;
                const isActive = activeSource.server_key === src.server_key && activeSource.source === src.source;

                return (
                  <div 
                    key={`${src.server_key}-${src.id}`} 
                    onClick={() => { onSelect(src); setIsOpen(false); }} 
                    className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] touch-manipulation ${
                      isActive 
                        ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_15px_rgba(0,245,255,0.15)] text-white' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isActive ? 'text-[#00F5FF]' : conf.color}`}>
                          {conf.label}
                        </span>
                        {isActive && (
                          <span className="flex items-center text-[#00F5FF]">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      {conf.badge ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                          {conf.badge}
                        </span>
                      ) : src.priority >= 10 ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">
                          Fast
                        </span>
                      ) : null}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-400">
                        {src.quality && (
                          <span className="px-1.5 py-0.5 bg-black/60 text-slate-300 rounded text-[11px] font-mono">
                            {src.quality}
                          </span>
                        )}
                        {src.language && (
                          <span className="text-[11px]">
                            {src.language}
                          </span>
                        )}
                      </div>
                      {src.id > 1000 && (
                        <button 
                          onClick={(e) => handleReport(e, src.id)} 
                          className="text-gray-500 hover:text-red-400 p-1 transition-colors" 
                          title="Report broken server"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
