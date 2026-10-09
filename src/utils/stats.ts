/** All analytics are derived from the user's WatchEvents — nothing is stored separately. */

import { getGenreName } from '@/constants/genres';
import type { MediaType } from '@/types/media';
import type { WatchEvent } from '@/types/user';
import { monthsAgo, startOfWeek } from './date';

export type StatsPeriod = 'week' | 'sixMonths' | 'year' | 'lifetime';

export const STATS_PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: 'week', label: 'This week' },
  { key: 'sixMonths', label: 'Last 6 months' },
  { key: 'year', label: 'Last year' },
  { key: 'lifetime', label: 'Lifetime' },
];

export interface PeriodStats {
  minutes: number;
  /** Movies watched, or episodes watched for TV. */
  count: number;
  /** Distinct titles (mostly useful for TV: "across 4 shows"). */
  titles: number;
}

function periodStart(period: StatsPeriod, now: Date): Date | null {
  switch (period) {
    case 'week':
      return startOfWeek(now);
    case 'sixMonths':
      return monthsAgo(now, 6);
    case 'year':
      return monthsAgo(now, 12);
    case 'lifetime':
      return null;
  }
}

export function filterByType(watches: WatchEvent[], mediaType: MediaType): WatchEvent[] {
  return watches.filter((watch) => watch.mediaType === mediaType);
}

export function computePeriodStats(watches: WatchEvent[], now = new Date()): Record<StatsPeriod, PeriodStats> {
  const result = {} as Record<StatsPeriod, PeriodStats>;

  for (const { key } of STATS_PERIODS) {
    const start = periodStart(key, now);
    const inPeriod = start ? watches.filter((watch) => new Date(watch.watchedAt) >= start) : watches;
    result[key] = {
      minutes: inPeriod.reduce((total, watch) => total + watch.runtime, 0),
      count: inPeriod.length,
      titles: new Set(inPeriod.map((watch) => watch.tmdbId)).size,
    };
  }
  return result;
}

export interface MonthBucket {
  label: string;
  minutes: number;
  count: number;
}

/** Hours watched per month for the last `months` months (oldest first). */
export function monthlyBreakdown(watches: WatchEvent[], months = 12, now = new Date()): MonthBucket[] {
  const buckets = new Map<string, MonthBucket>();
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short' });

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${date.getFullYear()}-${date.getMonth()}`, { label: formatter.format(date), minutes: 0, count: 0 });
  }
  for (const watch of watches) {
    const date = new Date(watch.watchedAt);
    const bucket = buckets.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) {
      bucket.minutes += watch.runtime;
      bucket.count += 1;
    }
  }
  return [...buckets.values()];
}

export interface GenreStat {
  genreId: number;
  name: string;
  count: number;
}

export function topGenres(watches: WatchEvent[], limit = 6): GenreStat[] {
  const counts = new Map<number, number>();
  for (const watch of watches) {
    for (const genreId of watch.genreIds) counts.set(genreId, (counts.get(genreId) ?? 0) + 1);
  }
  return [...counts]
    .map(([genreId, count]) => ({ genreId, name: getGenreName(genreId), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
