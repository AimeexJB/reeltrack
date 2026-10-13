import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useLibrary } from '@/context/LibraryContext';
import { fetchAiredEpisodes, useSeasonEpisodes } from '@/hooks/useMediaQueries';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Episode, MediaDetails, SeasonSummary } from '@/types/media';
import { formatDate, hasAired } from '@/utils/date';
import { episodeCode, formatRuntime } from '@/utils/format';
import { toSummary } from '@/utils/media';
import { airedEpisodesBySeason } from '@/utils/tvProgress';
import styles from './SeasonItem.module.css';

interface SeasonItemProps {
  show: MediaDetails;
  season: SeasonSummary;
  open: boolean;
  onToggle: () => void;
}

export function SeasonItem({ show, season, open, onToggle }: SeasonItemProps) {
  const library = useLibrary();
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuth();
  const { data: episodes, isLoading, error } = useSeasonEpisodes(show.id, season.seasonNumber, open);
  const summary = toSummary(show);

  const counts = library.getEpisodeCounts(show.id, season.seasonNumber);
  const watchedCount = counts.size;
  const progress = Math.min(100, (watchedCount / season.episodeCount) * 100);

  const airedEpisodes = episodes?.filter((episode) => hasAired(episode.airDate)) ?? [];
  // How many complete passes of this season (0 until every aired episode is watched).
  const seasonWatches = airedEpisodes.length ? Math.min(...airedEpisodes.map((episode) => counts.get(episode.episodeNumber) ?? 0)) : 0;

  /**
   * Watching an episode implies you've seen everything before it (like TV Time):
   * this season's earlier episodes are marked straight away, then any earlier seasons.
   * Specials (season 0) are standalone, so only the ticked episode is marked there.
   */
  const markWatchedUpTo = (episodesThisSeason: Episode[]) =>
    requireAuth(async () => {
      library.markEpisodesWatched(summary, episodesThisSeason, show.runtime);
      if (season.seasonNumber <= 0) return;
      const earlierSeasons = [...airedEpisodesBySeason(show).keys()].filter((number) => number > 0 && number < season.seasonNumber);
      if (earlierSeasons.length === 0) return;
      try {
        library.markEpisodesWatched(summary, await fetchAiredEpisodes(queryClient, show.id, earlierSeasons), show.runtime);
      } catch {
        // This season is already marked; earlier seasons can be marked with their own button if loading failed.
      }
    });

  const toggleEpisode = (episode: Episode) => {
    if (counts.has(episode.episodeNumber)) return requireAuth(() => library.unmarkEpisodes(show.id, [episode]));
    const upToHere = airedEpisodes.filter((other) => other.episodeNumber <= episode.episodeNumber);
    markWatchedUpTo(season.seasonNumber > 0 && upToHere.length ? upToHere : [episode]);
  };

  const markSeason = () => markWatchedUpTo(airedEpisodes);
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
