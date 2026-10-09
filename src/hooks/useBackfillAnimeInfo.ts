/**
 * Titles saved before anime support don't know their original language, so we can't tell if
 * they're anime. For tracked *animated* titles missing it, fetch the details once and save them —
 * they then move into the Anime section automatically. (Non-animated titles can't be anime, so
 * they're skipped.) Uses the same cached show/movie data as Upcoming Episodes.
 */

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { getMediaBasics } from '@/api/tmdb';
import { ANIMATION_GENRE_ID } from '@/constants/genres';
import { useLibrary } from '@/context/LibraryContext';
import type { MediaDetails } from '@/types/media';
import { toSummary } from '@/utils/media';

const SIX_HOURS = 6 * 60 * 60 * 1000;

function combineResults(results: UseQueryResult<MediaDetails>[]) {
  return results.map((result) => result.data);
}

export function useBackfillAnimeInfo(): void {
  const { data, loaded, refreshMedia } = useLibrary();

  const missing = useMemo(
    () =>
      Object.values(data.library)
        .map((entry) => entry.media)
        .filter((media) => media.originalLanguage === undefined && media.genreIds.includes(ANIMATION_GENRE_ID)),
    [data.library],
  );

  const details = useQueries({
    queries: missing.map((media) => ({
      queryKey: ['basics', media.mediaType, media.id],
      queryFn: () => getMediaBasics(media.mediaType, media.id),
      staleTime: SIX_HOURS,
    })),
    combine: combineResults,
  });

  useEffect(() => {
    if (!loaded) return;
    details.forEach((item, index) => {
      const media = missing[index];
      if (item && media && item.id === media.id && item.originalLanguage !== undefined) refreshMedia(toSummary(item));
    });
  }, [loaded, details, missing, refreshMedia]);
}
