import { Bookmark, Check, Eye, PlayCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { STATUS_LABELS, STATUSES_BY_TYPE } from '@/constants/tracking';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { MediaSummary } from '@/types/media';
import type { TrackStatus } from '@/types/user';
import { AddToListMenu } from './AddToListMenu';
import styles from './TrackActions.module.css';

const STATUS_ICONS: Record<TrackStatus, typeof Bookmark> = {
  watchlist: Bookmark,
  watching: PlayCircle,
  completed: Check,
};

interface TrackActionsProps {
  media: MediaSummary;
  /** Minutes — needed to log a movie watch. While unknown (still loading), "Mark as watched" is disabled. */
  runtime: number | undefined;
}

/** Watchlist / Watching / Completed / Mark as watched / Add to list buttons. Used on detail pages and in Quick View. */
export function TrackActions({ media, runtime }: TrackActionsProps) {
  const { user } = useAuth();
  const library = useLibrary();
  const requireAuth = useRequireAuth();
  const entry = library.getEntry(media);
  const isMovie = media.mediaType === 'movie';
  const watchCount = isMovie ? library.getMovieWatchCount(media.id) : 0;

  const toggleStatus = (status: TrackStatus) =>
    requireAuth(() => (entry?.status === status ? library.removeFromLibrary(media) : library.setStatus(media, status)));

  // For movies, "completed" is set by logging a watch (so stats stay accurate), not by a status button.
  const statusOptions = isMovie ? STATUSES_BY_TYPE.movie.filter((status) => status !== 'completed') : STATUSES_BY_TYPE.tv;

  return (
    <div className={styles.actions}>
      {statusOptions.map((status) => {
        const Icon = STATUS_ICONS[status];
        const active = entry?.status === status;
        return (
          <Button key={status} active={active} aria-pressed={active} onClick={() => toggleStatus(status)}>
            <Icon size={17} /> {STATUS_LABELS[status]}
          </Button>
        );
      })}

      {isMovie && (
        <>
          <Button
            variant={watchCount ? 'secondary' : 'primary'}
            active={watchCount > 0}
            disabled={runtime === undefined}
            onClick={() => requireAuth(() => library.logMovieWatch(media, runtime!))}
          >
            <Eye size={17} /> {watchCount ? `Watched ${watchCount}× · Log rewatch` : 'Mark as watched'}
          </Button>
          {watchCount > 0 && (
            <Button variant="ghost" onClick={() => library.undoMovieWatch(media)} aria-label="Undo last watch">
              <RotateCcw size={16} /> Undo
            </Button>
          )}
        </>
      )}

      {user && <AddToListMenu media={media} />}
    </div>
  );
}
