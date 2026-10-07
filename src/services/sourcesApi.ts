import { apiFetch } from './api';

export const sourcesApi = {
  getSources: (type: 'movie' | 'tv', id: number, season?: number, episode?: number) => {
    let url = `/sources/${type}/${id}`;
    if (season && episode) url += `?season=${season}&episode=${episode}`;
    // Fallback to standard fetch if apiFetch throws due to missing auth on public route
    return fetch((import.meta.env.VITE_API_URL ?? '/api') + url).then(res => res.json());
  },
  addSource: (data: any) =>
    apiFetch('/sources', { method: 'POST', body: JSON.stringify(data) }),
  updateSource: (id: number, data: any) =>
    apiFetch(`/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSource: (id: number) =>
    apiFetch(`/sources/${id}`, { method: 'DELETE' }),
  reportSource: (id: number) =>
    apiFetch('/sources/report', { method: 'POST', body: JSON.stringify({ source_id: id }) })
};
