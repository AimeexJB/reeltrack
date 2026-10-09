import { CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { imageUrl } from '@/api/tmdb';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { paths } from '@/constants/routes';
import { useUpcomingEpisodes, type UpcomingItem } from '@/hooks/useUpcomingEpisodes';
import { daysUntil, formatAirDay, formatDate } from '@/utils/date';
import { episodeCode } from '@/utils/format';
import sectionStyles from './ProfileSection.module.css';
import styles from './UpcomingEpisodes.module.css';

const INITIAL_COUNT = 8;

/** New episodes coming up for the TV shows you track, soonest first. */
export function UpcomingEpisodes() {
  const { items, isLoading, trackedCount } = useUpcomingEpisodes();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, INITIAL_COUNT);

  return (
    <section className={sectionStyles.section}>
      <div className={sectionStyles.header}>
        <h2 className={sectionStyles.heading}>Upcoming Episodes</h2>
      </div>

      {isLoading ? (
        <Spinner label="Checking for new episodes" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={trackedCount ? 'No upcoming episodes announced' : 'No TV shows tracked yet'}
          description={
            trackedCount
              ? 'None of your shows have a new episode scheduled yet. Dates appear here as soon as they’re announced.'
              : 'Add TV shows to your watchlist and their next episodes will show up here.'
          }
        />
      ) : (
        <>
          <ul className={styles.grid}>
            {visible.map((item) => (
              <UpcomingCard key={item.show.id} item={item} />
            ))}
          </ul>
          {items.length > INITIAL_COUNT && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)} className={styles.toggle}>
              {showAll ? 'Show fewer' : `Show all ${items.length}`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function UpcomingCard({ item: { show, episode } }: { item: UpcomingItem }) {
  const days = daysUntil(episode.airDate);
  const image = imageUrl(episode.stillPath, 'w300') ?? imageUrl(show.backdropPath, 'w300');
  const badge =
    episode.episodeNumber === 1 ? (episode.seasonNumber === 1 ? 'Series premiere' : 'Season premiere') : episode.episodeType === 'finale' ? 'Finale' : null;

  return (
    <li>
      <Link to={paths.media('tv', show.id)} className={styles.card}>
        <div className={styles.image}>
          {image ? <img src={image} alt="" loading="lazy" /> : <span className={styles.placeholder}>{show.title}</span>}
          <span className={styles.when} data-soon={days <= 1}>
            {formatAirDay(episode.airDate)}
          </span>
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
        <div className={styles.info}>
          <p className={styles.show}>{show.title}</p>
          <p className={styles.episode}>
            <span className={styles.code}>{episodeCode(episode.seasonNumber, episode.episodeNumber)}</span>
            {episode.name}
          </p>
          <p className={styles.date}>
            {formatDate(episode.airDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            {days > 1 && ` · in ${days} days`}
          </p>
        </div>
      </Link>
    </li>
  );
}
