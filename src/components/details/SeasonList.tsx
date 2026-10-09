import { useState } from 'react';
import type { MediaDetails } from '@/types/media';
import { SeasonItem } from './SeasonItem';
import styles from './SeasonList.module.css';

/** TV Time-style season tracker: expand a season to tick off episodes. */
export function SeasonList({ show }: { show: MediaDetails }) {
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  // Hide empty seasons and show "Specials" (season 0) last.
  const seasons = show.seasons
    .filter((season) => season.episodeCount > 0)
    .sort((a, b) => (a.seasonNumber || Infinity) - (b.seasonNumber || Infinity));

  if (seasons.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Seasons & Episodes</h2>
      <div className={styles.list}>
        {seasons.map((season) => (
          <SeasonItem
            key={season.seasonNumber}
            show={show}
            season={season}
            open={openSeason === season.seasonNumber}
            onToggle={() => setOpenSeason((current) => (current === season.seasonNumber ? null : season.seasonNumber))}
          />
        ))}
      </div>
    </section>
  );
}
