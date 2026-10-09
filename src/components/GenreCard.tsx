import React from 'react';
import { motion } from 'motion/react';

interface GenreCardProps {
  title: string;
  id: number;
  color: string;
  onClick?: () => void;
}

export const GenreCard: React.FC<GenreCardProps> = ({ title, id, color, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`group relative h-28 sm:h-36 md:h-44 rounded-2xl flex items-center justify-center cursor-pointer select-none overflow-hidden bg-gradient-to-br ${color} shadow-lg border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_10px_30px_rgba(0,245,255,0.2)]`}
    >
      <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
      <span className="relative z-10 text-white font-black text-lg sm:text-xl md:text-2xl tracking-tight text-center px-4 drop-shadow-md group-hover:text-cyan-200 transition-colors">
        {title}
      </span>
    </motion.div>
  );
};
