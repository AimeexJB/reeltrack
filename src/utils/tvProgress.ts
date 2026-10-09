/**
 * Works out how far through a show the user is, using TMDB's season list and its latest aired
 * episode — so we know "caught up" and "watched 2×" without downloading every season.
 */

import type { MediaDetails } from '@/types/media';

/** Regular-season number → how many of its episodes have aired (specials / season 0 excluded). */
export function airedEpisodesBySeason(show: MediaDetails): Map<number, number> {
  const aired = new Map<number, number>();
  const last = show.lastAiredEpisode;
  if (!last) return aired;
  for (const season of show.seasons) {
    if (season.seasonNumber <= 0 || season.seasonNumber > last.seasonNumber) continue;
    aired.set(season.seasonNumber, season.seasonNumber === last.seasonNumber ? last.episodeNumber : season.episodeCount);
  }
  return aired;
}

export interface ShowProgress {
  airedCount: number;
  watchedCount: number;
  /** How many times every aired episode has been watched (2 = watched once, rewatched once). */
  fullWatches: number;
  /** Seasons that have aired episodes the user hasn't seen yet. */
  seasonsWithUnwatched: number[];
}

export function getShowProgress(
  show: MediaDetails,
  getEpisodeCounts: (showId: number, seasonNumber: number) => Map<number, number>,
): ShowProgress {
  let airedCount = 0;
  let watchedCount = 0;
  let fullWatches = Infinity;
  const seasonsWithUnwatched: number[] = [];

  for (const [seasonNumber, aired] of airedEpisodesBySeason(show)) {
    const counts = getEpisodeCounts(show.id, seasonNumber);
    airedCount += aired;
    let seasonComplete = true;
    for (let episode = 1; episode <= aired; episode++) {
      const count = counts.get(episode) ?? 0;
      if (count > 0) watchedCount++;
      else seasonComplete = false;
      fullWatches = Math.min(fullWatches, count);
    }
    if (!seasonComplete) seasonsWithUnwatched.push(seasonNumber);
  }

  return { airedCount, watchedCount, fullWatches: airedCount ? fullWatches : 0, seasonsWithUnwatched };
}

/** TMDB statuses for shows that won't get new episodes (others: "Returning Series", "In Production", "Planned"…). */
const FINISHED_STATUSES = ['Ended', 'Canceled'];

export function hasFinishedAiring(show: MediaDetails): boolean {
  return FINISHED_STATUSES.includes(show.status);
}

/** Completed = the show has ended *and* every episode has been watched. Caught-up running shows stay "watching". */
export function isShowCompleted(show: MediaDetails, progress: ShowProgress): boolean {
  return hasFinishedAiring(show) && progress.airedCount > 0 && progress.watchedCount === progress.airedCount;
}
