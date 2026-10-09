import { Link } from 'react-router';
import { paths } from '@/constants/routes';
import type { WatchEvent } from '@/types/user';
import { formatRelativeTime } from '@/utils/date';
import { episodeCode, formatRuntime } from '@/utils/format';
import styles from './RecentActivity.module.css';

const LIMIT = 8;

export function RecentActivity({ watches }: { watches: WatchEvent[] }) {
  const recent = [...watches].sort((a, b) => b.watchedAt.localeCompare(a.watchedAt)).slice(0, LIMIT);

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Recent activity</h3>
      <ul className={styles.list}>
        {recent.map((watch) => (
          <li key={watch.id} className={styles.item}>
            <Link to={paths.media(watch.mediaType, watch.tmdbId)} className={styles.title}>
              {watch.title}
            </Link>
            {watch.seasonNumber !== undefined && watch.episodeNumber !== undefined && (
              <span className={styles.code}>{episodeCode(watch.seasonNumber, watch.episodeNumber)}</span>
            )}
            <span className={styles.meta}>
              {formatRuntime(watch.runtime)} · {formatRelativeTime(watch.watchedAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
