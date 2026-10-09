import { ExternalLink, Play, Star } from 'lucide-react';
import { imageUrl } from '@/api/tmdb';
import { MEDIA_TYPE_LABELS } from '@/constants/tracking';
import type { MediaDetails } from '@/types/media';
import { getYear } from '@/utils/date';
import { toSummary } from '@/utils/media';
import { formatRuntime, pluralize } from '@/utils/format';
import { ShowWatchActions } from './ShowWatchActions';
import { TrackActions } from './TrackActions';
import styles from './DetailHero.module.css';

export function DetailHero({ details }: { details: MediaDetails }) {
  const backdrop = imageUrl(details.backdropPath, 'w1280');
  const poster = imageUrl(details.posterPath, 'w500');
  const year = getYear(details.releaseDate);

  const facts = [
    MEDIA_TYPE_LABELS[details.mediaType].singular,
    year,
    details.mediaType === 'movie' ? formatRuntime(details.runtime) : details.numberOfEpisodes && pluralize(details.numberOfEpisodes, 'episode'),
    details.status,
  ].filter(Boolean);

  return (
    <section className={styles.hero}>
      {backdrop && <img src={backdrop} alt="" className={styles.backdrop} fetchPriority="high" />}
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.poster}>{poster && <img src={poster} alt={`${details.title} poster`} />}</div>

        <div className={styles.info}>
          <h1 className={styles.title}>{details.title}</h1>
          {details.tagline && <p className={styles.tagline}>{details.tagline}</p>}

          <div className={styles.facts}>
            {details.rating > 0 && (
              <span className={styles.rating}>
                <Star size={15} fill="currentColor" /> {details.rating.toFixed(1)}
                <span className={styles.votes}>({details.voteCount.toLocaleString()})</span>
              </span>
            )}
            {facts.map((fact) => (
              <span key={String(fact)}>{fact}</span>
            ))}
          </div>

          <div className={styles.genres}>
            {details.genres.map((genre) => (
              <span key={genre.id} className={styles.genre}>
                {genre.name}
              </span>
            ))}
          </div>

          <p className={styles.overview}>{details.overview || 'No overview available.'}</p>

          <TrackActions media={toSummary(details)} runtime={details.runtime} />
          {details.mediaType === 'tv' && <ShowWatchActions show={details} />}

          <div className={styles.links}>
            {details.trailerKey && (
              <a href={`https://www.youtube.com/watch?v=${details.trailerKey}`} target="_blank" rel="noreferrer" className={styles.link}>
                <Play size={16} /> Watch trailer
              </a>
            )}
            {details.imdbId && (
              <a href={`https://www.imdb.com/title/${details.imdbId}`} target="_blank" rel="noreferrer" className={styles.link}>
                <ExternalLink size={16} /> IMDb
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
