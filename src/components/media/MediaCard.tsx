import { Check, Plus, Star } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router';
import { imageUrl } from '@/api/tmdb';
import { MEDIA_TYPE_LABELS, STATUS_LABELS } from '@/constants/tracking';
import { paths } from '@/constants/routes';
import { useLibrary } from '@/context/LibraryContext';
import { useQuickView } from '@/context/QuickViewContext';
import type { MediaSummary } from '@/types/media';
import { getYear } from '@/utils/date';
import styles from './MediaCard.module.css';

/**
 * Poster card used in every row and grid. Clicking opens the full page;
 * the corner button opens Quick View for adding to your watchlist/lists without leaving.
 */
export const MediaCard = memo(function MediaCard({ media }: { media: MediaSummary }) {
  const entry = useLibrary().getEntry(media);
  const { openQuickView } = useQuickView();
  const poster = imageUrl(media.posterPath, 'w342');
  const year = getYear(media.releaseDate);

  return (
    <div className={styles.card}>
      <Link to={paths.media(media.mediaType, media.id)} className={styles.link}>
        <div className={styles.poster}>
          {poster ? (
            <img src={poster} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className={styles.placeholder}>{media.title}</span>
          )}
          {media.rating > 0 && (
            <span className={styles.rating}>
              <Star size={11} fill="currentColor" />
              {media.rating.toFixed(1)}
            </span>
          )}
          {entry && (
            <span className={styles.status} data-status={entry.status}>
              {STATUS_LABELS[entry.status]}
            </span>
          )}
        </div>
        <p className={styles.title} title={media.title}>
          {media.title}
        </p>
        <p className={styles.meta}>
          <span className={styles.type} data-type={media.mediaType} />
          {MEDIA_TYPE_LABELS[media.mediaType].singular}
          {year && ` · ${year}`}
        </p>
      </Link>

      <button
        type="button"
        className={styles.quickButton}
        data-tracked={Boolean(entry)}
        onClick={() => openQuickView(media)}
        aria-label={`Quick view ${media.title}`}
        title="Quick view"
      >
        {entry ? <Check size={16} strokeWidth={3} /> : <Plus size={18} strokeWidth={2.5} />}
      </button>
    </div>
  );
});
