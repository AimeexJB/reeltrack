/** Shapes returned by TMDB. Only used inside `api/tmdb` — mappers convert them to app types. */

import type { Genre } from '@/types/media';

export interface RawMedia {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  genres?: Genre[];
}

export interface RawPaged {
  page: number;
  total_pages: number;
  total_results: number;
  results: RawMedia[];
}

export interface RawCast {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
}

export interface RawVideo {
  key: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface RawSeason {
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface RawEpisode {
  id: number;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
}

export interface RawDetails extends RawMedia {
  tagline?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  last_episode_to_air?: { runtime: number | null; season_number: number; episode_number: number } | null;
  next_episode_to_air?: {
    name: string;
    air_date: string | null;
    season_number: number;
    episode_number: number;
    episode_type?: string;
    still_path: string | null;
  } | null;
  status?: string;
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  credits?: { cast: RawCast[] };
  videos?: { results: RawVideo[] };
  recommendations?: RawPaged;
  seasons?: RawSeason[];
  number_of_episodes?: number;
}

export interface RawSeasonDetails {
  episodes: RawEpisode[];
}

export interface RawFindEpisode {
  id: number;
  show_id: number;
  season_number: number;
  episode_number: number;
  runtime?: number | null;
}

export interface RawFindResult {
  movie_results: RawMedia[];
  tv_results: RawMedia[];
  tv_episode_results: RawFindEpisode[];
}
