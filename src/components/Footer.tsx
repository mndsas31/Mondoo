import React from 'react';
import { useLocation } from 'react-router-dom';

export const Footer: React.FC = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/watch')) return null;

  return (
    <footer className="max-w-5xl mx-auto px-4 py-16 text-gray-500 text-sm mt-12 border-t border-zinc-800">
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
