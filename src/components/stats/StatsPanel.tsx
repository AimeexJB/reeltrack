import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MediaType } from '@/types/media';
import type { WatchEvent } from '@/types/user';
import { computePeriodStats, filterByType, monthlyBreakdown, STATS_PERIODS, topGenres } from '@/utils/stats';
import { GenreBreakdown } from './GenreBreakdown';
import { MonthlyChart } from './MonthlyChart';
import { RecentActivity } from './RecentActivity';
import { StatCard } from './StatCard';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  watches: WatchEvent[];
  mediaType: MediaType;
}

/** All analytics for one media type: period totals, a 12-month chart, top genres and recent activity. */
export function StatsPanel({ watches, mediaType }: StatsPanelProps) {
  const typed = useMemo(() => filterByType(watches, mediaType), [watches, mediaType]);
  const periods = useMemo(() => computePeriodStats(typed), [typed]);
  const months = useMemo(() => monthlyBreakdown(typed), [typed]);
  const genres = useMemo(() => topGenres(typed), [typed]);

  if (typed.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={`No ${mediaType === 'movie' ? 'movies' : 'episodes'} logged yet`}
        description={
          mediaType === 'movie'
            ? 'Open any movie and press “Mark as watched” — your hours and counts will appear here.'
            : 'Open any show and tick off episodes in the season list — your hours and counts will appear here.'
        }
      />
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.cards}>
        {STATS_PERIODS.map(({ key, label }) => (
          <StatCard key={key} label={label} stats={periods[key]} mediaType={mediaType} highlight={key === 'lifetime'} />
        ))}
      </div>
      <div className={styles.charts}>
        <MonthlyChart months={months} mediaType={mediaType} />
        <GenreBreakdown genres={genres} />
      </div>
      <RecentActivity watches={typed} />
    </div>
  );
}
