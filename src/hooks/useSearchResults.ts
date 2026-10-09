import { useMemo } from 'react';
import { fetchSearchPage } from '@/services/searchService';
import type { SearchFilters } from '@/types/search';
import { sortMedia } from '@/utils/media';
import { useInfiniteMedia } from './useMediaQueries';

export function useSearchResults(filters: SearchFilters) {
  const { query, items, totalResults } = useInfiniteMedia(['search', filters], (page) => fetchSearchPage(filters, page));

  // Text search comes back in relevance order; re-sort only if the user picked rating/newest.
  const sorted = useMemo(
    () => (filters.query && filters.sort !== 'popularity' ? sortMedia(items, filters.sort) : items),
    [items, filters.query, filters.sort],
  );

  return { query, items: sorted, totalResults };
}
