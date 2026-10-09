/**
 * Decides which TMDB endpoint(s) to call for a set of search filters:
 *  - with a text query → TMDB search (then filter genre/year/rating client-side)
 *  - without a query  → TMDB discover (filters applied server-side)
 */

import { discover, searchByType, searchMulti } from '@/api/tmdb';
import type { MediaSummary, PagedResult } from '@/types/media';
import type { SearchFilters } from '@/types/search';
import { matchesFilters, sortMedia } from '@/utils/media';

export async function fetchSearchPage(filters: SearchFilters, page: number): Promise<PagedResult<MediaSummary>> {
  if (filters.query) {
    const result =
      filters.mediaType === 'all'
        ? await searchMulti(filters.query, page)
        : await searchByType(filters.mediaType, filters.query, page, filters.year);
    return { ...result, results: result.results.filter((media) => matchesFilters(media, filters)) };
  }

  if (filters.mediaType !== 'all') return discover(filters.mediaType, filters, page);

  // "All" without a query: discover movies and TV side-by-side and merge.
  const [movies, shows] = await Promise.all([discover('movie', filters, page), discover('tv', filters, page)]);
  return {
    page,
    totalPages: Math.max(movies.totalPages, shows.totalPages),
    totalResults: movies.totalResults + shows.totalResults,
    results: sortMedia([...movies.results, ...shows.results], filters.sort),
  };
}
