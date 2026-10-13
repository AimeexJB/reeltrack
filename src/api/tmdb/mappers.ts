/** Convert raw TMDB responses into the clean app types in `@/types/media`. */

import { DEFAULT_EPISODE_RUNTIME, DEFAULT_MOVIE_RUNTIME } from '@/constants/defaults';
import type { CastMember, Episode, MediaDetails, MediaSummary, MediaType, PagedResult, PersonCredit, PersonDetails } from '@/types/media';
import type { RawAggregateCast, RawCast, RawDetails, RawEpisode, RawMedia, RawPaged, RawPerson } from './rawTypes';

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
    originalLanguage: raw.original_language,
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

/** How many cast members the detail page's row shows ("Show full cast" loads everyone). */
const TOP_CAST = 20;

export function toCastMember(member: RawCast): CastMember {
  return { id: member.id, name: member.name, character: member.character ?? '', profilePath: member.profile_path };
}

/** TV full cast: main cast first (most episodes), with their characters and episode count. */
export function toAggregateCast(cast: RawAggregateCast[]): CastMember[] {
  return [...cast]
    .sort((a, b) => (b.total_episode_count ?? 0) - (a.total_episode_count ?? 0) || (a.order ?? 0) - (b.order ?? 0))
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: [...(member.roles ?? [])]
        .sort((a, b) => b.episode_count - a.episode_count)
        .map((role) => role.character)
        .filter(Boolean)
        .slice(0, 2)
        .join(' / '),
      profilePath: member.profile_path,
      episodeCount: member.total_episode_count,
    }));
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
    // TV: TMDB's plain `credits` only covers the latest season (sometimes just 2 people), so use the
    // every-season list, main cast first. Movies: billing order.
    cast:
      mediaType === 'tv' && raw.aggregate_credits
        ? toAggregateCast(raw.aggregate_credits.cast).slice(0, TOP_CAST)
        : (raw.credits?.cast ?? []).slice(0, TOP_CAST).map(toCastMember),
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

/** Talk shows, news and reality TV — appearances there aren't what people know an actor from. */
const NON_ACTING_GENRES = [10767, 10763, 10764];
const SELF_CHARACTER = /^(self|himself|herself|themselves|themself)\b/i;

export function toPersonDetails(raw: RawPerson): PersonDetails {
  const seen = new Set<string>();
  const credits: PersonCredit[] = [];

  for (const credit of raw.combined_credits?.cast ?? []) {
    const media = toMediaSummary(credit);
    if (!media) continue;
    if (media.genreIds.some((id) => NON_ACTING_GENRES.includes(id))) continue;
    if (SELF_CHARACTER.test(credit.character ?? '')) continue;
    const key = `${media.mediaType}:${media.id}`;
    if (seen.has(key)) continue; // TV credits can repeat (one per character)
    seen.add(key);
    credits.push({ ...media, character: credit.character ?? '', episodeCount: credit.episode_count ?? null });
  }

  // "Best known": vote count reflects lasting fame; popularity only says what's trending this week.
  credits.sort((a, b) => b.voteCount - a.voteCount || b.popularity - a.popularity);

  return {
    id: raw.id,
    name: raw.name,
    profilePath: raw.profile_path,
    biography: raw.biography ?? '',
    birthday: raw.birthday ?? null,
    deathday: raw.deathday ?? null,
    placeOfBirth: raw.place_of_birth ?? null,
    knownForDepartment: raw.known_for_department ?? 'Acting',
    credits,
  };
}
