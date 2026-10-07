export interface Movie {
  id: number;
  title?: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
  popularity?: number;
  media_type?: 'movie' | 'tv' | 'person';
  name?: string;
}

export interface TVShow {
  id: number;
  name?: string;
  original_name?: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  release_date?: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
  popularity?: number;
  media_type?: 'movie' | 'tv' | 'person';
  title?: string;
}

export type Media = Movie | TVShow;

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Genre {
  id: number;
  name: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Season {
  id?: number;
  season_number: number;
  episode_count: number;
  name: string;
}

export interface MediaDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  genres: Genre[];
  tagline: string;
  seasons?: Season[];
  media_type?: 'movie' | 'tv';
  videos: {
    results: Video[];
  };
  credits: {
    cast: Cast[];
  };
  similar: {
    results: Media[];
  };
  recommendations: {
    results: Media[];
  };
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime: number | null;
}

export interface SeasonDetails {
  _id: string;
  air_date: string;
  episodes: Episode[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
}
