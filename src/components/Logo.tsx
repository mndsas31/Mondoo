import React from 'react';
import { Film } from 'lucide-react';
import { cn } from '../utils/cn';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center">
        <Film className="w-8 h-8 text-[#00F5FF] absolute transform -rotate-12 opacity-80" />
        <div className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] tracking-tighter z-10 drop-shadow-sm">
          M
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-black text-white tracking-tighter leading-none -mb-1">
          MondoFlix
        </span>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none ml-0.5">
          Cinematic
        </span>
      </div>
    </div>
  );
};
