import React from 'react';

export const SkeletonRow: React.FC<{ title?: boolean }> = ({ title = true }) => {
  return (
    <div className="mb-10 px-4 md:px-10">
      {title && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-slate-800 rounded-full animate-pulse" />
          <div className="w-48 h-6 bg-slate-800 rounded animate-pulse" />
        </div>
      )}
      <div className="flex gap-4 overflow-x-hidden pb-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col gap-2 shrink-0">
             <div className="w-[140px] sm:w-[160px] md:w-[190px] lg:w-[210px] aspect-[2/3] bg-slate-800 rounded-lg animate-pulse" />
             <div className="w-3/4 h-4 bg-slate-800 rounded animate-pulse" />
             <div className="w-1/2 h-3 bg-slate-800 rounded animate-pulse mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const Footer: React.FC = () => {
  return (
    <footer className="max-w-5xl mx-auto px-4 py-16 text-gray-500 text-sm">
      <div className="flex items-center gap-4 mb-8">
        <a href="#" className="hover:text-white transition-colors">Facebook</a>
        <a href="#" className="hover:text-white transition-colors">Instagram</a>
        <a href="#" className="hover:text-white transition-colors">Twitter</a>
        <a href="#" className="hover:text-white transition-colors">YouTube</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="flex flex-col gap-3">
          <a href="#" className="hover:underline">Audio Description</a>
          <a href="#" className="hover:underline">Investor Relations</a>
          <a href="#" className="hover:underline">Legal Notices</a>
        </div>
        <div className="flex flex-col gap-3">
          <a href="#" className="hover:underline">Help Center</a>
          <a href="#" className="hover:underline">Jobs</a>
          <a href="#" className="hover:underline">Cookie Preferences</a>
        </div>
        <div className="flex flex-col gap-3">
          <a href="#" className="hover:underline">Gift Cards</a>
          <a href="#" className="hover:underline">Terms of Use</a>
          <a href="#" className="hover:underline">Corporate Information</a>
        </div>
        <div className="flex flex-col gap-3">
          <a href="#" className="hover:underline">Media Center</a>
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Contact Us</a>
        </div>
      </div>
      <button className="border border-gray-500 px-4 py-2 hover:text-white hover:border-white transition-colors mb-4">
        Service Code
      </button>
      <p>&copy; {new Date().getFullYear()} MondoFlix, Inc.</p>
    </footer>
  );
};
