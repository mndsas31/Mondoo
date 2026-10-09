import React, { useState } from 'react';
import { api } from '../../services/tmdbApi';
import { sourcesApi } from '../../services/sourcesApi';
import { SERVERS } from '../../utils/servers';
import { Search, Plus, Trash2, Power, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import type { MediaSource } from '../../hooks/useSources';

export const SourceManager = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [sources, setSources] = useState<MediaSource[]>([]);
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  
  // New Source Form State
  const [newKey, setNewKey] = useState(Object.keys(SERVERS)[0] || 'vidstuck');
  const [newSource, setNewSource] = useState('');
  const [quality, setQuality] = useState('1080p');
  
  if ((user as any)?.role !== 'admin') return <Navigate to="/" />;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.search(query);
    setResults(res.data.results.filter((r: any) => r.media_type !== 'person'));
  };

  const loadSources = async (item = selected, s = season, ep = episode) => {
    if (!item) return;
    const res = await sourcesApi.getSources(item.media_type || (item.title ? 'movie' : 'tv'), item.id, item.media_type === 'tv' ? s : undefined, item.media_type === 'tv' ? ep : undefined);
    setSources(res.sources);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await sourcesApi.addSource({
      media_id: selected.id, media_type: selected.media_type || (selected.title ? 'movie' : 'tv'),
      season: selected.media_type === 'tv' ? season : undefined,
      episode: selected.media_type === 'tv' ? episode : undefined,
      server_key: newKey, source: newSource, quality, priority: 0
    });
    setNewSource('');
    loadSources();
  };

  return (
    <div className="max-w-6xl mx-auto p-8 pt-24 text-white">
      <h1 className="text-3xl font-bold mb-8 text-teal-400">Server Source Management</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input type="text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search TMDB..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2" />
            <button type="submit" className="bg-violet-600 p-2 rounded-lg"><Search className="w-5 h-5"/></button>
          </form>
          
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {results.map(r => (
              <div key={r.id} onClick={() => { setSelected(r); loadSources(r); }} className={`p-3 rounded-lg border cursor-pointer flex gap-3 ${selected?.id === r.id ? 'bg-teal-500/20 border-teal-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                {r.poster_path && <img src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} className="w-10 h-14 object-cover rounded" />}
                <div>
                  <h4 className="font-bold line-clamp-1">{r.title || r.name}</h4>
                  <span className="text-xs text-gray-400 uppercase tracking-widest">{r.media_type || (r.title ? 'movie' : 'tv')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">{selected.title || selected.name}</h2>
              {(!selected.media_type || selected.media_type === 'tv' || !selected.title) && (
                <div className="flex gap-4 mb-6">
                  <label className="flex-1">Season <input type="number" value={season} onChange={e=>{setSeason(+e.target.value); loadSources(selected, +e.target.value, episode)}} className="w-full bg-black/40 border border-white/10 rounded p-2 mt-1" /></label>
                  <label className="flex-1">Episode <input type="number" value={episode} onChange={e=>{setEpisode(+e.target.value); loadSources(selected, season, +e.target.value)}} className="w-full bg-black/40 border border-white/10 rounded p-2 mt-1" /></label>
                </div>
              )}
              
              <h3 className="font-bold text-gray-400 mb-3 uppercase tracking-wider text-sm">Existing Sources</h3>
              <div className="space-y-3 mb-8">
                {sources.length === 0 && <p className="text-sm text-gray-500">No custom sources found.</p>}
                {sources.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-lg">
                    <div>
                      <span className="font-bold text-teal-400 mr-2">{SERVERS[s.server_key]?.label}</span>
                      <span className="text-sm text-gray-400">{s.source}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {s.reports > 0 && <span className="text-red-400 text-xs flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> {s.reports}</span>}
                      <button onClick={async () => { await sourcesApi.updateSource(s.id, { is_active: !s.is_active }); loadSources(); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${s.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}><Power className="w-4 h-4" /></button>
                      <button onClick={async () => { await sourcesApi.deleteSource(s.id); loadSources(); }} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="font-bold text-gray-400 mb-3 uppercase tracking-wider text-sm">Add New Source</h3>
              <form onSubmit={handleAdd} className="space-y-4 bg-black/40 p-4 rounded-lg border border-white/10">
                <div className="flex gap-4">
                  <select value={newKey} onChange={e=>setNewKey(e.target.value)} className="bg-[#0A1428] border border-white/10 rounded p-2 text-white">
                    {Object.entries(SERVERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <input type="text" value={newSource} onChange={e=>setNewSource(e.target.value)} placeholder="File ID or https:// url" className="flex-1 bg-[#0A1428] border border-white/10 rounded p-2" required />
                  <select value={quality} onChange={e=>setQuality(e.target.value)} className="bg-[#0A1428] border border-white/10 rounded p-2 text-white">
                    <option>1080p</option><option>720p</option><option>4K</option>
                  </select>
                </div>
                <div className="text-xs text-gray-500 truncate">Preview: {SERVERS[newKey]?.buildUrl(newSource || 'ID_HERE')}</div>
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 py-2 rounded font-bold flex justify-center items-center gap-2"><Plus className="w-4 h-4"/> Add Source</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
