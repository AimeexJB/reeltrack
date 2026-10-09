/** App-level media types. These are what components use — never the raw TMDB shapes. */

export type MediaType = 'movie' | 'tv';

export interface Genre {
  id: number;
  name: string;
}

/** The lightweight shape used for cards, rows, grids and saved lists. */
export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  /** YYYY-MM-DD, or an empty string when unknown. */
  releaseDate: string;
  rating: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  /** ISO 639-1 code, e.g. 'ja'. Used to tell anime apart (older saved items may not have it yet). */
  originalLanguage?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface SeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
}

export interface Episode {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
}

/** The next episode of a show that hasn't aired yet. */
export interface UpcomingEpisode {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  airDate: string;
  stillPath: string | null;
  /** TMDB marks premieres/finales: 'standard' | 'finale' | 'mid_season'. */
  episodeType: string;
}

/** Everything shown on a movie / TV show detail page. */
export interface MediaDetails extends MediaSummary {
  tagline: string;
  genres: Genre[];
  /** Movie length, or typical episode length for TV (minutes). */
  runtime: number;
  status: string;
  imdbId: string | null;
  cast: CastMember[];
  trailerKey: string | null;
  recommendations: MediaSummary[];
  /** TV only — empty for movies. */
  seasons: SeasonSummary[];
  numberOfEpisodes: number | null;
  /** TV only — the latest episode that has aired, used to work out "caught up" and full rewatches. */
  lastAiredEpisode: { seasonNumber: number; episodeNumber: number } | null;
  /** TV only — the next scheduled episode, if TMDB knows one. */
  nextEpisode: UpcomingEpisode | null;
}

export interface PagedResult<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}
