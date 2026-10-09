import { Check, ChevronDown, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useLibrary } from '@/context/LibraryContext';
import { useSeasonEpisodes } from '@/hooks/useMediaQueries';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Episode, MediaDetails, SeasonSummary } from '@/types/media';
import { formatDate, hasAired } from '@/utils/date';
import { episodeCode, formatRuntime } from '@/utils/format';
import { toSummary } from '@/utils/media';
import styles from './SeasonItem.module.css';

interface SeasonItemProps {
  show: MediaDetails;
  season: SeasonSummary;
  open: boolean;
  onToggle: () => void;
}

export function SeasonItem({ show, season, open, onToggle }: SeasonItemProps) {
  const library = useLibrary();
  const requireAuth = useRequireAuth();
  const { data: episodes, isLoading, error } = useSeasonEpisodes(show.id, season.seasonNumber, open);
  const summary = toSummary(show);

  const counts = library.getEpisodeCounts(show.id, season.seasonNumber);
  const watchedCount = counts.size;
  const progress = Math.min(100, (watchedCount / season.episodeCount) * 100);

  const airedEpisodes = episodes?.filter((episode) => hasAired(episode.airDate)) ?? [];
  // How many complete passes of this season (0 until every aired episode is watched).
  const seasonWatches = airedEpisodes.length ? Math.min(...airedEpisodes.map((episode) => counts.get(episode.episodeNumber) ?? 0)) : 0;

  const toggleEpisode = (episode: Episode) =>
    requireAuth(() =>
      counts.has(episode.episodeNumber)
        ? library.unmarkEpisodes(show.id, [episode])
        : library.markEpisodesWatched(summary, [episode], show.runtime),
    );

  const markSeason = () => requireAuth(() => library.markEpisodesWatched(summary, airedEpisodes, show.runtime));
  const unmarkSeason = () => {
    if (window.confirm(`Unmark all of ${season.name}? This removes these episodes (and any rewatches) from your history.`)) {
      library.unmarkEpisodes(show.id, airedEpisodes);
    }
  };
  const rewatchSeason = () => requireAuth(() => library.logEpisodeRewatch(summary, airedEpisodes, show.runtime));
  const rewatchEpisode = (episode: Episode) => requireAuth(() => library.logEpisodeRewatch(summary, [episode], show.runtime));

  return (
    <div className={styles.season}>
      <button type="button" className={styles.header} onClick={onToggle} aria-expanded={open}>
        <span className={styles.name}>{season.name}</span>
        <span className={styles.progressText}>
          {watchedCount}/{season.episodeCount}
        </span>
        <span className={styles.progressBar} aria-hidden>
          <span style={{ width: `${progress}%` }} />
        </span>
        <ChevronDown size={18} className={styles.chevron} />
      </button>

      {open && (
        <div className={styles.body}>
          {isLoading && <Spinner />}
          {error && <ErrorMessage error={error} />}
          {episodes && (
            <>
              {airedEpisodes.length > 0 && (
                <div className={styles.seasonActions}>
                  {seasonWatches === 0 ? (
                    <Button size="sm" onClick={markSeason}>
                      <Check size={15} /> Mark season as watched
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={unmarkSeason}>
                        Unmark season
                      </Button>
                      <Button size="sm" active onClick={rewatchSeason}>
                        <Repeat size={15} /> Watched {seasonWatches}× · Log season rewatch
                      </Button>
                    </>
                  )}
                </div>
              )}
              <ol className={styles.episodes}>
                {episodes.map((episode) => {
                  const timesWatched = counts.get(episode.episodeNumber) ?? 0;
                  const aired = hasAired(episode.airDate);
                  const code = episodeCode(episode.seasonNumber, episode.episodeNumber);
                  return (
                    <li key={episode.id} className={styles.episode} data-watched={timesWatched > 0}>
                      <button
                        type="button"
                        className={styles.checkbox}
                        onClick={() => toggleEpisode(episode)}
                        disabled={!aired}
                        aria-pressed={timesWatched > 0}
                        aria-label={`${timesWatched ? 'Unmark' : 'Mark'} ${code} as watched`}
                      >
                        {timesWatched > 0 && <Check size={16} strokeWidth={3} />}
                      </button>
                      <div className={styles.episodeInfo}>
                        <p className={styles.episodeTitle}>
                          <span className={styles.code}>{code}</span>
                          {episode.name}
                          {timesWatched > 1 && <span className={styles.timesBadge}>×{timesWatched}</span>}
                        </p>
                        <p className={styles.episodeMeta}>
                          {aired ? formatDate(episode.airDate) : `Airs ${formatDate(episode.airDate)}`}
                          {episode.runtime ? ` · ${formatRuntime(episode.runtime)}` : ''}
                        </p>
                      </div>
                      {timesWatched > 0 && (
                        <button
                          type="button"
                          className={styles.rewatch}
                          onClick={() => rewatchEpisode(episode)}
                          aria-label={`Log a rewatch of ${code}`}
                          title="Log rewatch"
                        >
                          <Repeat size={15} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
