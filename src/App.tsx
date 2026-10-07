import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Series } from './pages/Series';
import { Films } from './pages/Films';
import { NewPopular } from './pages/NewPopular';
import { Search } from './pages/Search';
import { Watch } from './pages/Watch';
import { SourceManager } from './components/admin/SourceManager';
import { WatchlistProvider } from './context/WatchlistContext';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';

function App() {
  return (
    <AuthProvider>
      <WatchlistProvider>
        <Router>
          <div className="min-h-screen bg-[#0A1428] text-white selection:bg-cyan-500/30 selection:text-cyan-200 pb-16 md:pb-0">
            <AuthModal />
            <SettingsModal />
            <Navbar />
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/series" element={<Series />} />
            <Route path="/films" element={<Films />} />
            <Route path="/new-and-popular" element={<NewPopular />} />
            <Route path="/search" element={<Search />} />
            <Route path="/watch/:type/:id" element={<Watch />} />
            <Route path="/watch/:type/:id/season/:season/episode/:episode" element={<Watch />} />
            <Route path="/admin/sources" element={<SourceManager />} />
          </Routes>
        </div>
      </Router>
    </WatchlistProvider>
    </AuthProvider>
  );
}

export default App;
