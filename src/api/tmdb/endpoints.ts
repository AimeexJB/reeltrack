/** One function per TMDB endpoint the app uses. Components call these through hooks in `@/hooks`. */

import type { Episode, MediaDetails, MediaSummary, MediaType, PagedResult } from '@/types/media';
import type { SearchFilters, SortOption } from '@/types/search';
import { todayIso } from '@/utils/date';
import { tmdbFetch } from './client';
import { toEpisode, toMediaDetails, toMediaSummary, toPagedResult } from './mappers';
import type { RawDetails, RawFindResult, RawPaged, RawSeasonDetails } from './rawTypes';

type Paged = PagedResult<MediaSummary>;

/** Any list endpoint, e.g. `/movie/popular` or `/trending/tv/week`. */
export async function getMediaList(path: string, mediaType?: MediaType, page = 1): Promise<Paged> {
  return toPagedResult(await tmdbFetch<RawPaged>(path, { page }), mediaType);
}

export async function getMediaDetails(mediaType: MediaType, id: number): Promise<MediaDetails> {
  const raw = await tmdbFetch<RawDetails>(`/${mediaType}/${id}`, {
    append_to_response: 'credits,videos,recommendations,external_ids',
  });
  return toMediaDetails(raw, mediaType);
}

/** Details without cast/videos/recommendations — used by importers, where we only need the basics. */
export async function getMediaBasics(mediaType: MediaType, id: number): Promise<MediaDetails> {
  return toMediaDetails(await tmdbFetch<RawDetails>(`/${mediaType}/${id}`), mediaType);
}

export interface FindResult {
  movie: MediaSummary | null;
  show: MediaSummary | null;
  episode: { showId: number; seasonNumber: number; episodeNumber: number; runtime: number | null } | null;
}

/** Look up a title by its IMDb id (tt1234567) or TVDB id. */
export async function findByExternalId(externalId: string, source: 'imdb_id' | 'tvdb_id'): Promise<FindResult> {
  const raw = await tmdbFetch<RawFindResult>(`/find/${encodeURIComponent(externalId)}`, { external_source: source });
  const episode = raw.tv_episode_results[0];
  return {
    movie: raw.movie_results[0] ? toMediaSummary(raw.movie_results[0], 'movie') : null,
    show: raw.tv_results[0] ? toMediaSummary(raw.tv_results[0], 'tv') : null,
    episode: episode
      ? { showId: episode.show_id, seasonNumber: episode.season_number, episodeNumber: episode.episode_number, runtime: episode.runtime ?? null }
      : null,
  };
}

export async function getSeasonEpisodes(tvId: number, seasonNumber: number): Promise<Episode[]> {
  const raw = await tmdbFetch<RawSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
  return raw.episodes.map(toEpisode);
}

export function getRecommendations(mediaType: MediaType, id: number): Promise<Paged> {
  return getMediaList(`/${mediaType}/${id}/recommendations`, mediaType);
}

export async function searchMulti(query: string, page = 1): Promise<Paged> {
  return toPagedResult(await tmdbFetch<RawPaged>('/search/multi', { query, page, include_adult: 'false' }));
}

export async function searchByType(mediaType: MediaType, query: string, page = 1, year?: number): Promise<Paged> {
  const yearParam = mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year';
  const raw = await tmdbFetch<RawPaged>(`/search/${mediaType}`, { query, page, include_adult: 'false', [yearParam]: year });
  return toPagedResult(raw, mediaType);
}

const SORT_PARAMS: Record<SortOption, Record<MediaType, string>> = {
  popularity: { movie: 'popularity.desc', tv: 'popularity.desc' },
  rating: { movie: 'vote_average.desc', tv: 'vote_average.desc' },
  newest: { movie: 'primary_release_date.desc', tv: 'first_air_date.desc' },
};

export type DiscoverFilters = Omit<SearchFilters, 'query' | 'mediaType' | 'sort'> & {
  sort?: SortOption;
  /** Extra genres that must *all* match (e.g. Animation for anime). */
  requiredGenreIds?: number[];
  /** ISO 639-1 original language, e.g. 'ja'. */
  originalLanguage?: string;
  /** TV only: shows with an episode airing in the last/next week. */
  airingNow?: boolean;
  /** Minimum number of ratings — filters out obscure titles that game the popularity score. */
  minVoteCount?: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Browse the whole TMDB catalogue with filters (no text query). */
export async function discover(mediaType: MediaType, filters: DiscoverFilters, page = 1): Promise<Paged> {
  const sort = filters.sort ?? 'popularity';
  const isMovie = mediaType === 'movie';

  const raw = await tmdbFetch<RawPaged>(`/discover/${mediaType}`, {
    page,
    include_adult: 'false',
    sort_by: SORT_PARAMS[sort][mediaType],
    // Comma = AND in TMDB, so "16,10759" means Animation *and* Action & Adventure.
    with_genres: [...(filters.requiredGenreIds ?? []), filters.genreId].filter(Boolean).join(',') || undefined,
    with_original_language: filters.originalLanguage,
    'air_date.gte': filters.airingNow && !isMovie ? isoDate(new Date(Date.now() - WEEK_MS)) : undefined,
    'air_date.lte': filters.airingNow && !isMovie ? isoDate(new Date(Date.now() + WEEK_MS)) : undefined,
    'vote_average.gte': filters.minRating,
    // Without a vote floor, "highest rated" is dominated by obscure titles with one 10/10 vote.
    'vote_count.gte': filters.minVoteCount ?? (sort === 'rating' ? 300 : sort === 'newest' ? 10 : undefined),
    [isMovie ? 'primary_release_year' : 'first_air_date_year']: filters.year,
    // Keep "newest" to things that have actually been released.
    [isMovie ? 'primary_release_date.lte' : 'first_air_date.lte']: sort === 'newest' ? todayIso() : undefined,
  });
  return toPagedResult(raw, mediaType);
}
