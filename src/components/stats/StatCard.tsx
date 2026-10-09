import type { MediaType } from '@/types/media';
import { formatLongDuration, minutesToHours, pluralize } from '@/utils/format';
import type { PeriodStats } from '@/utils/stats';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  stats: PeriodStats;
  mediaType: MediaType;
  highlight?: boolean;
}

export function StatCard({ label, stats, mediaType, highlight }: StatCardProps) {
  const countLabel = mediaType === 'movie' ? pluralize(stats.count, 'movie') : pluralize(stats.count, 'episode');

  return (
    <div className={styles.card} data-highlight={highlight} data-type={mediaType}>
      <p className={styles.label}>{label}</p>
      <p className={styles.hours}>
        {minutesToHours(stats.minutes)}
        <span className={styles.unit}>hrs</span>
      </p>
      <p className={styles.count}>
        {countLabel}
        {mediaType === 'tv' && stats.titles > 0 && ` · ${pluralize(stats.titles, 'show')}`}
      </p>
      {highlight && stats.minutes > 0 && <p className={styles.long}>{formatLongDuration(stats.minutes)}</p>}
    </div>
  );
}
