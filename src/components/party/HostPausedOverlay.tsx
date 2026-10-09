import React from 'react';
import { PauseCircle, RefreshCw, Gamepad2, Loader2, Play } from 'lucide-react';
import { motion } from 'motion/react';

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md pointer-events-auto select-none p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        className="bg-[#070D18]/95 border border-cyan-500/30 p-6 sm:p-8 rounded-3xl shadow-[0_0_50px_rgba(0,245,255,0.2)] flex flex-col items-center max-w-sm w-full text-center relative overflow-hidden"
      >
        {/* Glow ambient background aura */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
          <PauseCircle className="w-8 h-8 text-amber-400 animate-pulse" />
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">
          Host Paused Video
        </h3>
        
        <p className="text-slate-400 mb-6 text-xs sm:text-sm leading-relaxed">
          {canControl 
            ? "Playback is currently paused for the watch party. Click Resume Playback to continue watching together."
            : "The host paused the playback. When the host resumes, your screen will automatically sync and continue."
          }
        </p>

        <div className="flex items-center gap-3 w-full justify-center flex-wrap">
          {canControl && onTogglePause ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onTogglePause}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs sm:text-sm rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Playback</span>
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onResync}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sync Now</span>
              </motion.button>
              {onRequestControl && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onRequestControl}
                  disabled={isControlRequestPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                >
                  {isControlRequestPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Requested...</span>
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="w-3.5 h-3.5 text-cyan-200" />
                      <span>Request Control</span>
                    </>
                  )}
                </motion.button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
