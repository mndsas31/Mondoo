import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className, onClick }) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else {
      navigate('/');
    }
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={handleClick}
      className={cn("flex items-center gap-2.5 select-none cursor-pointer", className)}
      role="button"
      tabIndex={0}
      title="MondoFlix - Home"
    >
      <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-violet-600 p-[1.5px] shadow-[0_0_16px_rgba(6,182,212,0.4)]">
        <div className="w-full h-full bg-[#070D18] rounded-[10px] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 fill-cyan-400" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3.5a1.5 1.5 0 0 1 2.274-1.284l13 7.5a1.5 1.5 0 0 1 0 2.568l-13 7.5A1.5 1.5 0 0 1 4 18.5v-15z" />
          </svg>
        </div>
      </div>
      <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
        Mondo<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300">Flix</span>
      </span>
    </motion.div>
  );
};
