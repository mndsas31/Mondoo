import React from 'react';

export const SkeletonRow: React.FC<{ title?: boolean }> = ({ title = true }) => {
  return (
    <div className="mb-10 px-4 md:px-10 select-none">
      {title && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-slate-800 rounded-full animate-pulse" />
          <div className="w-44 h-6 bg-slate-800/80 rounded-lg animate-pulse" />
        </div>
      )}
      <div className="flex gap-4 overflow-x-hidden pb-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 shrink-0">
            <div className="w-[140px] sm:w-[160px] md:w-[190px] lg:w-[210px] aspect-[2/3] bg-gradient-to-b from-slate-900 via-slate-800/50 to-slate-900 rounded-2xl border border-white/5 animate-pulse" />
            <div className="w-3/4 h-4 bg-slate-800/80 rounded-lg animate-pulse" />
            <div className="w-1/2 h-3 bg-slate-800/50 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};
