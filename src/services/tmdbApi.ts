/// <reference types="vite/client" />
import axios from 'axios';
import { TMDBResponse, Media, MediaDetails } from '../types';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '1e07d79b02f02cfcc74f4e3ee19cc234';
const BASE_URL = 'https://api.themoviedb.org/3';

export const tmdbAxios = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
});

export const EMBED_BASE = 'https://www.vidking.net';

export const getImageUrl = (path: string, size: 'w500' | 'w780' | 'original' = 'original') => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getMovieEmbedUrl = (tmdbId: number | string, progress: number = 0, quality: string = 'auto') => {
  return `${EMBED_BASE}/embed/movie/${tmdbId}?color=00f5ff&autoPlay=true${progress > 0 ? `&progress=${progress}` : ''}${quality !== 'auto' ? `&quality=${quality}` : ''}`;
};

export const getTvEmbedUrl = (tmdbId: number | string, season: number | string, episode: number | string, progress: number = 0, quality: string = 'auto') => {
  return `${EMBED_BASE}/embed/tv/${tmdbId}/${season}/${episode}?color=00f5ff&autoPlay=true&nextEpisode=true&episodeSelector=true${progress > 0 ? `&progress=${progress}` : ''}${quality !== 'auto' ? `&quality=${quality}` : ''}`;
};

export const api = {
  getTrending: (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week') =>
    tmdbAxios.get<TMDBResponse<Media>>(`/trending/${mediaType}/${timeWindow}`),
  
  getPopularMovies: () => tmdbAxios.get<TMDBResponse<Media>>(`/movie/popular`),
  getTopRatedMovies: () => tmdbAxios.get<TMDBResponse<Media>>(`/movie/top_rated`),
  getUpcomingMovies: () => tmdbAxios.get<TMDBResponse<Media>>(`/movie/upcoming`),
  
  getPopularTV: () => tmdbAxios.get<TMDBResponse<Media>>(`/tv/popular`),

  getMoviesByGenre: (genreId: number) => 
    tmdbAxios.get<TMDBResponse<Media>>(`/discover/movie`, { params: { with_genres: genreId } }),

  search: (query: string) => 
    tmdbAxios.get<TMDBResponse<Media>>(`/search/multi`, { params: { query, include_adult: false } }),
  
  getDetails: (mediaType: 'movie' | 'tv', id: number) =>
    tmdbAxios.get<MediaDetails>(`/${mediaType}/${id}`, { 
      params: { append_to_response: 'videos,credits,similar,recommendations' } 
    }),
};

export const GENRES = {
  ACTION: 28,
  COMEDY: 35,
  HORROR: 27,
  SCIFI: 878,
  DRAMA: 18,
  ANIMATION: 16,
  THRILLER: 53,
  CRIME: 80,
  DOCUMENTARY: 99,
  ROMANCE: 10749,
  FANTASY: 14,
};

export const getSeasonDetails = (tvId: number | string, seasonNumber: number | string) =>
  tmdbAxios.get<import('../types').SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
