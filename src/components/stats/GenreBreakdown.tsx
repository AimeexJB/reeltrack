import type { GenreStat } from '@/utils/stats';
import styles from './GenreBreakdown.module.css';

export function GenreBreakdown({ genres }: { genres: GenreStat[] }) {
  const max = Math.max(...genres.map((genre) => genre.count), 1);

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Top genres</h3>
      {genres.length === 0 ? (
        <p className={styles.empty}>No genre data yet.</p>
      ) : (
        <ul className={styles.list}>
          {genres.map((genre) => (
            <li key={genre.genreId} className={styles.item}>
              <div className={styles.row}>
                <span>{genre.name}</span>
                <span className={styles.count}>{genre.count}</span>
              </div>
              <div className={styles.track}>
                <div className={styles.bar} style={{ width: `${(genre.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
