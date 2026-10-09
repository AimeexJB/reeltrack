/**
 * Personalised picks: take the user's most recently tracked titles, fetch TMDB recommendations
 * for each, then rank titles that show up for several of them highest. Already-tracked titles are hidden.
 */

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getRecommendations } from '@/api/tmdb';
import { RECOMMENDATION_SEED_COUNT } from '@/constants/defaults';
import { useLibrary } from '@/context/LibraryContext';
import type { MediaSummary, PagedResult } from '@/types/media';
import { mediaKey } from '@/utils/media';

const ONE_HOUR = 60 * 60 * 1000;

// Defined outside the component so React Query can memoise the combined result between renders.
function combineResults(results: UseQueryResult<PagedResult<MediaSummary>>[]) {
  return {
    pages: results.map((result) => result.data?.results ?? []),
    isLoading: results.some((result) => result.isLoading),
  };
}

export function useRecommendations() {
  const { data } = useLibrary();

  const seeds = useMemo(
    () =>
      Object.values(data.library)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, RECOMMENDATION_SEED_COUNT)
        .map((entry) => entry.media),
    [data.library],
  );

  const { pages, isLoading } = useQueries({
    queries: seeds.map((seed) => ({
      queryKey: ['recommendations', seed.mediaType, seed.id],
      queryFn: () => getRecommendations(seed.mediaType, seed.id),
      staleTime: ONE_HOUR,
    })),
    combine: combineResults,
  });

  const items = useMemo(() => {
    const scores = new Map<string, { media: MediaSummary; score: number }>();
    for (const page of pages) {
      for (const media of page) {
        const key = mediaKey(media);
        if (data.library[key]) continue;
        const existing = scores.get(key);
        // Each appearance adds a point; rating breaks ties so better titles float up.
        scores.set(key, { media, score: (existing?.score ?? 0) + 1 + media.rating / 20 });
      }
    }
    return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, 30).map((entry) => entry.media);
  }, [data.library, pages]);

  return { items, isLoading: isLoading && items.length === 0, hasSeeds: seeds.length > 0 };
}
