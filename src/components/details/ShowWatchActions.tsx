import { useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Eye, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useLibrary } from '@/context/LibraryContext';
import { seasonQuery } from '@/hooks/useMediaQueries';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Episode, MediaDetails } from '@/types/media';
import { hasAired } from '@/utils/date';
import { minutesToHours, pluralize } from '@/utils/format';
import { toSummary } from '@/utils/media';
import { airedEpisodesBySeason, getShowProgress, hasFinishedAiring } from '@/utils/tvProgress';
import styles from './ShowWatchActions.module.css';

/**
 * Whole-show tracking for TV: "Mark all as watched" until you're caught up,
 * then "Watched 1× · Log rewatch" (like movies).
 */
export function ShowWatchActions({ show }: { show: MediaDetails }) {
  const library = useLibrary();
  const requireAuth = useRequireAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const progress = getShowProgress(show, library.getEpisodeCounts);
  if (progress.airedCount === 0) return null;

  const summary = toSummary(show);
  const caughtUp = progress.watchedCount === progress.airedCount;

  /** Downloads the episode lists (cached) for the given seasons and keeps only aired episodes. */
  const loadAiredEpisodes = async (seasonNumbers: number[]): Promise<Episode[]> => {
    const seasons = await Promise.all(seasonNumbers.map((number) => queryClient.fetchQuery(seasonQuery(show.id, number))));
    return seasons.flat().filter((episode) => hasAired(episode.airDate));
  };

  const run = (task: () => Promise<void>) =>
    requireAuth(async () => {
      setBusy(true);
      try {
        await task();
      } finally {
        setBusy(false);
      }
    });

  const markAllWatched = () =>
    run(async () => {
      const episodes = await loadAiredEpisodes(progress.seasonsWithUnwatched);
      library.markEpisodesWatched(summary, episodes, show.runtime);
      // A show that has ended is now completed; a running one stays "watching" (you're caught up).
      if (hasFinishedAiring(show)) library.setStatus(summary, 'completed');
    });

  const allSeasons = [...airedEpisodesBySeason(show).keys()];

  const logRewatch = () =>
    run(async () => {
      const episodes = await loadAiredEpisodes(allSeasons);
      const hours = minutesToHours(episodes.reduce((total, episode) => total + (episode.runtime || show.runtime), 0));
      if (!window.confirm(`Log a full rewatch of ${show.title}? This adds ${pluralize(episodes.length, 'episode')} (${hours} hours) to your stats.`)) return;
      library.logEpisodeRewatch(summary, episodes, show.runtime);
    });

  const undoRewatch = () => run(async () => library.undoEpisodeRewatch(show.id, await loadAiredEpisodes(allSeasons)));

  return (
    <div className={styles.wrapper}>
      <div className={styles.progress}>
        <span>
          {progress.watchedCount}/{pluralize(progress.airedCount, 'episode')} watched
        </span>
        <span className={styles.bar} aria-hidden>
          <span style={{ width: `${(progress.watchedCount / progress.airedCount) * 100}%` }} />
        </span>
      </div>

      <div className={styles.actions}>
        {!caughtUp && (
          <Button variant="primary" onClick={markAllWatched} disabled={busy}>
            <CheckCheck size={17} /> {busy ? 'Marking…' : 'Mark all as watched'}
          </Button>
        )}
        {progress.fullWatches > 0 && (
          <Button active onClick={logRewatch} disabled={busy}>
            <Eye size={17} /> Watched {progress.fullWatches}× · Log rewatch
          </Button>
        )}
        {progress.fullWatches > 1 && (
          <Button variant="ghost" onClick={undoRewatch} disabled={busy} aria-label="Undo last rewatch">
            <RotateCcw size={16} /> Undo
          </Button>
        )}
      </div>
    </div>
  );
}
