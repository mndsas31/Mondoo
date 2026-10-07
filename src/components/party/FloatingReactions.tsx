import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { FloatingReactionItem } from '../../types/party';

interface FloatingReactionsProps {
  reactions: FloatingReactionItem[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 40, scale: 0.5, x: `${r.xOffset}%` }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: -360,
              scale: [0.6, 1.25, 1.1, 0.9],
              x: `${r.xOffset + (Math.sin(parseInt(r.id.slice(-3), 16) || 1) * 15)}%`
            }}
            transition={{ duration: 2.8, ease: "easeOut" }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 shadow-2xl"
          >
            {r.userAvatar && (
              <span className="text-base select-none">{r.userAvatar}</span>
            )}
            <span className="text-3xl select-none filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {r.emoji}
            </span>
            <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
              {r.userName}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
