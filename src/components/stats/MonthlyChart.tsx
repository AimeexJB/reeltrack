import type { MediaType } from '@/types/media';
import { minutesToHours } from '@/utils/format';
import type { MonthBucket } from '@/utils/stats';
import styles from './MonthlyChart.module.css';

/** Simple bar chart of hours watched per month — plain HTML/CSS, no chart library needed. */
export function MonthlyChart({ months, mediaType }: { months: MonthBucket[]; mediaType: MediaType }) {
  const max = Math.max(...months.map((month) => month.minutes), 1);
  const unit = mediaType === 'movie' ? 'movies' : 'episodes';

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Hours per month</h3>
      <div className={styles.chart} data-type={mediaType}>
        {months.map((month, index) => (
          <div key={index} className={styles.column} title={`${month.label}: ${minutesToHours(month.minutes)}h · ${month.count} ${unit}`}>
            <span className={styles.value}>{month.minutes > 0 ? minutesToHours(month.minutes) : ''}</span>
            <div className={styles.barTrack}>
              <div className={styles.bar} style={{ height: `${(month.minutes / max) * 100}%` }} />
            </div>
            <span className={styles.label}>{month.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
