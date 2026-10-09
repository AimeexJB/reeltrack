/**
 * Next episodes for every TV show in the user's library (watchlist, watching or completed —
 * so a new season of a finished show shows up too). One cached TMDB request per show.
 */

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getMediaBasics } from '@/api/tmdb';
import { useLibrary } from '@/context/LibraryContext';
import type { MediaDetails, MediaSummary, UpcomingEpisode } from '@/types/media';
import { todayIso } from '@/utils/date';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export interface UpcomingItem {
  show: MediaSummary;
  episode: UpcomingEpisode;
}

// Outside the component so React Query can keep the combined result stable between renders.
function combineResults(results: UseQueryResult<MediaDetails>[]) {
  return {
    shows: results.map((result) => result.data),
    isLoading: results.some((result) => result.isLoading),
  };
}

export function useUpcomingEpisodes() {
  const { data } = useLibrary();

  const trackedShows = useMemo(
    () => Object.values(data.library).filter((entry) => entry.media.mediaType === 'tv').map((entry) => entry.media),
    [data.library],
  );

  const { shows, isLoading } = useQueries({
    queries: trackedShows.map((show) => ({
      queryKey: ['basics', 'tv', show.id],
      queryFn: () => getMediaBasics('tv', show.id),
      staleTime: SIX_HOURS,
    })),
    combine: combineResults,
  });

  const items = useMemo(() => {
    const today = todayIso();
    const upcoming: UpcomingItem[] = [];
    shows.forEach((details, index) => {
      const episode = details?.nextEpisode;
      if (episode && episode.airDate >= today) upcoming.push({ show: trackedShows[index], episode });
    });
    return upcoming.sort((a, b) => a.episode.airDate.localeCompare(b.episode.airDate));
  }, [shows, trackedShows]);

  return { items, isLoading: isLoading && items.length === 0, trackedCount: trackedShows.length };
}
