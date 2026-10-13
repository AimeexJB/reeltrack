/** React Query hooks for TMDB data. Responses are cached, so revisiting a page is instant. */

import { useInfiniteQuery, useQuery, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getFullCast, getMediaDetails, getMediaList, getSeasonEpisodes, searchMulti } from '@/api/tmdb';
import type { Episode, MediaSummary, MediaType, PagedResult } from '@/types/media';
import { hasAired } from '@/utils/date';
import { dedupeMedia } from '@/utils/media';

export function useMediaList(path: string, mediaType?: MediaType, enabled = true) {
  return useQuery({
    queryKey: ['list', path],
    queryFn: () => getMediaList(path, mediaType),
    enabled,
  });
}

export function useMediaDetails(mediaType: MediaType, id: number) {
  return useQuery({
    queryKey: ['details', mediaType, id],
    queryFn: () => getMediaDetails(mediaType, id),
    enabled: Number.isFinite(id),
  });
}

/** Shared by useSeasonEpisodes and the "mark all / rewatch" buttons, so both use the same cache. */
export const seasonQuery = (tvId: number, seasonNumber: number) => ({
  queryKey: ['season', tvId, seasonNumber],
  queryFn: () => getSeasonEpisodes(tvId, seasonNumber),
});

export function useSeasonEpisodes(tvId: number, seasonNumber: number, enabled: boolean) {
  return useQuery({ ...seasonQuery(tvId, seasonNumber), enabled });
}

/** Loads several seasons' episode lists (from the cache when possible) and keeps only episodes that have aired. */
export async function fetchAiredEpisodes(queryClient: QueryClient, tvId: number, seasonNumbers: number[]): Promise<Episode[]> {
  const seasons = await Promise.all(seasonNumbers.map((number) => queryClient.fetchQuery(seasonQuery(tvId, number))));
  return seasons.flat().filter((episode) => hasAired(episode.airDate));
}

export function useFullCast(mediaType: MediaType, id: number, enabled: boolean) {
  return useQuery({ queryKey: ['full-cast', mediaType, id], queryFn: () => getFullCast(mediaType, id), enabled, staleTime: 24 * 60 * 60 * 1000 });
}

export function useQuickSearch(query: string) {
  return useQuery({
    queryKey: ['quick-search', query],
    queryFn: () => searchMulti(query),
    enabled: query.length >= 2,
    placeholderData: (previous) => previous,
  });
}

/** Paginated results for grids with infinite scrolling. Returns a flat, de-duplicated `items` array. */
export function useInfiniteMedia(queryKey: unknown[], fetchPage: (page: number) => Promise<PagedResult<MediaSummary>>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 1,
    // TMDB caps pagination at page 500.
    getNextPageParam: (last) => (last.page < Math.min(last.totalPages, 500) ? last.page + 1 : undefined),
  });

  const items = useMemo(() => dedupeMedia(query.data?.pages.flatMap((page) => page.results) ?? []), [query.data]);
  const totalResults = query.data?.pages[0]?.totalResults ?? 0;

  return { query, items, totalResults };
}
