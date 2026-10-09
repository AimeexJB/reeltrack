/**
 * Turns IDs and titles from import files into TMDB titles.
 * Every lookup is cached, so a file with 500 episodes of one show only looks the show up once.
 */

import { findByExternalId, getMediaBasics, searchByType, type FindResult } from '@/api/tmdb';
import { DEFAULT_EPISODE_RUNTIME, DEFAULT_MOVIE_RUNTIME } from '@/constants/defaults';
import type { MediaSummary, MediaType } from '@/types/media';
import { getYear } from '@/utils/date';
import { toSummary } from '@/utils/media';

export interface ResolvedTitle {
  media: MediaSummary;
  /** Movie length or typical episode length, in minutes. */
  runtime: number;
}

export class TmdbResolver {
  private cache = new Map<string, Promise<unknown>>();

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (!this.cache.has(key)) {
      // A failed lookup counts as "not found" rather than failing the whole import.
      this.cache.set(key, load().catch(() => null));
    }
    return this.cache.get(key) as Promise<T>;
  }

  title(mediaType: MediaType, id: number): Promise<ResolvedTitle | null> {
    return this.cached(`title:${mediaType}:${id}`, async () => {
      const details = await getMediaBasics(mediaType, id);
      return { media: toSummary(details), runtime: details.runtime || (mediaType === 'movie' ? DEFAULT_MOVIE_RUNTIME : DEFAULT_EPISODE_RUNTIME) };
    });
  }

  find(externalId: string, source: 'imdb_id' | 'tvdb_id'): Promise<FindResult | null> {
    return this.cached(`find:${source}:${externalId}`, () => findByExternalId(externalId, source));
  }

  /** Best match by name. If a year is given, prefer a result from that year. */
  search(mediaType: MediaType, title: string, year?: number): Promise<ResolvedTitle | null> {
    return this.cached(`search:${mediaType}:${title.toLowerCase()}:${year ?? ''}`, async () => {
      const { results } = await searchByType(mediaType, title, 1);
      const match = (year && results.find((result) => getYear(result.releaseDate) === year)) || results[0];
      return match ? this.title(mediaType, match.id) : null;
    });
  }
}
