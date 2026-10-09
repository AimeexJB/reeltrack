/**
 * Marks a TV show "Completed" once it has finished airing and every episode has been watched — however the episodes
 * were logged (ticked, season/show buttons, IMDb/TV Time/Plex imports, Plex auto-sync).
 * Runs in the background while the app is open. Show data is shared with Upcoming Episodes' cache.
 */

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { getMediaBasics } from '@/api/tmdb';
import { useLibrary } from '@/context/LibraryContext';
import type { MediaDetails } from '@/types/media';
import { getShowProgress, isShowCompleted } from '@/utils/tvProgress';

const SIX_HOURS = 6 * 60 * 60 * 1000;

function combineResults(results: UseQueryResult<MediaDetails>[]) {
  return results.map((result) => result.data);
}

export function useAutoCompleteShows(): void {
  const { data, loaded, getEpisodeCounts, setStatus } = useLibrary();

  // Only shows that aren't completed yet and have at least one episode watched.
  const candidates = useMemo(() => {
    const showsWithWatches = new Set(data.watches.filter((watch) => watch.mediaType === 'tv').map((watch) => watch.tmdbId));
    return Object.values(data.library).filter(
      (entry) => entry.media.mediaType === 'tv' && entry.status !== 'completed' && showsWithWatches.has(entry.media.id),
    );
  }, [data.library, data.watches]);

  const shows = useQueries({
    queries: candidates.map((entry) => ({
      queryKey: ['basics', 'tv', entry.media.id],
      queryFn: () => getMediaBasics('tv', entry.media.id),
      staleTime: SIX_HOURS,
    })),
    combine: combineResults,
  });

  useEffect(() => {
    if (!loaded) return;
    shows.forEach((details, index) => {
      const entry = candidates[index];
      if (!details || !entry || details.id !== entry.media.id) return;
      if (isShowCompleted(details, getShowProgress(details, getEpisodeCounts))) setStatus(entry.media, 'completed');
    });
  }, [loaded, shows, candidates, getEpisodeCounts, setStatus]);
}
