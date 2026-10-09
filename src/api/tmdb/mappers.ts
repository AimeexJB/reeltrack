/** Convert raw TMDB responses into the clean app types in `@/types/media`. */

import { DEFAULT_EPISODE_RUNTIME, DEFAULT_MOVIE_RUNTIME } from '@/constants/defaults';
import type { Episode, MediaDetails, MediaSummary, MediaType, PagedResult } from '@/types/media';
import type { RawDetails, RawEpisode, RawMedia, RawPaged } from './rawTypes';

export function toMediaSummary(raw: RawMedia, fallbackType?: MediaType): MediaSummary | null {
  const mediaType = raw.media_type ?? fallbackType;
  // Multi-search also returns people — we only care about movies and TV.
  if (mediaType !== 'movie' && mediaType !== 'tv') return null;

  return {
    id: raw.id,
    mediaType,
    title: raw.title ?? raw.name ?? 'Untitled',
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    overview: raw.overview ?? '',
    releaseDate: raw.release_date ?? raw.first_air_date ?? '',
    rating: raw.vote_average ?? 0,
    voteCount: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
    genreIds: raw.genre_ids ?? raw.genres?.map((genre) => genre.id) ?? [],
  };
}

export function toPagedResult(raw: RawPaged, fallbackType?: MediaType): PagedResult<MediaSummary> {
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    results: raw.results.map((item) => toMediaSummary(item, fallbackType)).filter((item) => item !== null),
  };
}

export function toMediaDetails(raw: RawDetails, mediaType: MediaType): MediaDetails {
  const summary = toMediaSummary(raw, mediaType)!;
  const trailer = raw.videos?.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer');
  const runtime =
    mediaType === 'movie'
      ? raw.runtime || DEFAULT_MOVIE_RUNTIME
      : raw.episode_run_time?.[0] || raw.last_episode_to_air?.runtime || DEFAULT_EPISODE_RUNTIME;

  return {
    ...summary,
    tagline: raw.tagline ?? '',
    genres: raw.genres ?? [],
    runtime,
    status: raw.status ?? '',
    imdbId: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    cast: (raw.credits?.cast ?? []).slice(0, 15).map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character ?? '',
      profilePath: member.profile_path,
    })),
    trailerKey: trailer?.key ?? null,
    recommendations: raw.recommendations ? toPagedResult(raw.recommendations, mediaType).results : [],
    seasons: (raw.seasons ?? []).map((season) => ({
      seasonNumber: season.season_number,
      name: season.name,
      episodeCount: season.episode_count,
      airDate: season.air_date,
      posterPath: season.poster_path,
    })),
    numberOfEpisodes: raw.number_of_episodes ?? null,
    lastAiredEpisode: raw.last_episode_to_air
      ? { seasonNumber: raw.last_episode_to_air.season_number, episodeNumber: raw.last_episode_to_air.episode_number }
      : null,
    nextEpisode: raw.next_episode_to_air?.air_date
      ? {
          seasonNumber: raw.next_episode_to_air.season_number,
          episodeNumber: raw.next_episode_to_air.episode_number,
          name: raw.next_episode_to_air.name,
          airDate: raw.next_episode_to_air.air_date,
          stillPath: raw.next_episode_to_air.still_path,
          episodeType: raw.next_episode_to_air.episode_type ?? 'standard',
        }
      : null,
  };
}

export function toEpisode(raw: RawEpisode): Episode {
  return {
    id: raw.id,
    seasonNumber: raw.season_number,
    episodeNumber: raw.episode_number,
    name: raw.name,
    overview: raw.overview,
    airDate: raw.air_date,
    runtime: raw.runtime,
    stillPath: raw.still_path,
  };
}
