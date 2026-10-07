import React from 'react';
import { PauseCircle, RefreshCw, Gamepad2, Loader2, Play } from 'lucide-react';

interface HostPausedOverlayProps {
  onResync: () => void;
  onRequestControl?: () => void;
  isControlRequestPending?: boolean;
  onTogglePause?: () => void;
  canControl?: boolean;
}

export function HostPausedOverlay({ 
  onResync, 
  onRequestControl, 
  isControlRequestPending = false,
  onTogglePause,
  canControl = false
}: HostPausedOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-[#0A1428]/95 border border-cyan-500/30 p-6 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center animate-in zoom-in fade-in duration-300">
        <PauseCircle className="w-12 h-12 text-yellow-400 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-white mb-2">Host Paused Video</h3>
        <p className="text-gray-400 mb-6 text-xs sm:text-sm">
          {canControl 
            ? "Playback is currently paused for the watch party. Click Resume Playback to start watching for everyone."
            : "The host has paused the playback. When the host resumes, your screen will automatically sync and continue."
          }
        </p>
        <div className="flex items-center gap-3 w-full justify-center flex-wrap">
          {canControl && onTogglePause ? (
            <button
              onClick={onTogglePause}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Playback</span>
            </button>
          ) : (
            <>
              <button
                onClick={onResync}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/10"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                Sync Now
              </button>
              {onRequestControl && (
                <button
                  onClick={onRequestControl}
                  disabled={isControlRequestPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                >
                  {isControlRequestPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Requested...</span>
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="w-4 h-4 text-cyan-200" />
                      <span>Request Control</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
