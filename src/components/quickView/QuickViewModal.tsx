import { ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router';
import { imageUrl } from '@/api/tmdb';
import { TrackActions } from '@/components/details/TrackActions';
import { Modal } from '@/components/ui/Modal';
import { getGenreName } from '@/constants/genres';
import { MEDIA_TYPE_LABELS } from '@/constants/tracking';
import { paths } from '@/constants/routes';
import { useMediaDetails } from '@/hooks/useMediaQueries';
import type { MediaSummary } from '@/types/media';
import { getYear } from '@/utils/date';
import { formatRuntime, pluralize } from '@/utils/format';
import styles from './QuickViewModal.module.css';

const TITLE_ID = 'quick-view-title';

interface QuickViewModalProps {
  media: MediaSummary | null;
  onClose: () => void;
}

export function QuickViewModal({ media, onClose }: QuickViewModalProps) {
  return (
    <Modal open={media !== null} onClose={onClose} labelledBy={TITLE_ID}>
      {media && <QuickViewContent key={`${media.mediaType}-${media.id}`} media={media} />}
    </Modal>
  );
}

/** Quick preview of a title with tracking buttons — no need to open the full page. */
function QuickViewContent({ media }: { media: MediaSummary }) {
  // Card data shows instantly; full details (runtime, genres) load in and are cached for the full page.
  const { data: details } = useMediaDetails(media.mediaType, media.id);

  const backdrop = imageUrl(media.backdropPath, 'w780');
  const poster = imageUrl(media.posterPath, 'w342');
  const genres = details?.genres.map((genre) => genre.name) ?? media.genreIds.map(getGenreName);
  const length =
    media.mediaType === 'movie'
      ? formatRuntime(details?.runtime)
      : details?.numberOfEpisodes && pluralize(details.numberOfEpisodes, 'episode');
  const facts = [MEDIA_TYPE_LABELS[media.mediaType].singular, getYear(media.releaseDate), length].filter(Boolean);

  return (
    <article>
      <div className={styles.banner}>{backdrop && <img src={backdrop} alt="" />}</div>

      <div className={styles.body}>
        <div className={styles.poster}>{poster && <img src={poster} alt="" />}</div>

        <div className={styles.info}>
          <h2 id={TITLE_ID} className={styles.title}>
            {media.title}
          </h2>
          <p className={styles.facts}>
            {media.rating > 0 && (
              <span className={styles.rating}>
                <Star size={14} fill="currentColor" /> {media.rating.toFixed(1)}
                <span className={styles.votes}>({media.voteCount.toLocaleString()})</span>
              </span>
            )}
            {facts.map((fact) => (
              <span key={String(fact)}>{fact}</span>
            ))}
          </p>
          {genres.length > 0 && <p className={styles.genres}>{genres.join(' · ')}</p>}
        </div>
      </div>

      <div className={styles.content}>
        <p className={styles.overview}>{media.overview || 'No description available.'}</p>
        <TrackActions media={media} runtime={details?.runtime} />
        <Link to={paths.media(media.mediaType, media.id)} className={styles.fullLink}>
          {media.mediaType === 'tv' ? 'Track episodes & see full details' : 'See full details'} <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
