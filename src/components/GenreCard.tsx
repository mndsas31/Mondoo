import React from 'react';

interface GenreCardProps {
  title: string;
  id: number;
  color: string;
  onClick?: () => void;
}

export const GenreCard: React.FC<GenreCardProps> = ({ title, id, color, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`h-32 sm:h-40 md:h-48 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1 bg-gradient-to-br ${color} shadow-lg shadow-black/50 border border-white/10 hover:shadow-cyan-500/20`}
    >
      <span className="text-white font-bold text-xl sm:text-2xl tracking-wider text-shadow-md pointer-events-none">{title}</span>
    </div>
  );
};
