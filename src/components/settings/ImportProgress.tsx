import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { ImportPhase } from '@/hooks/useImportFlow';
import type { ImportResult } from '@/types/import';
import { pluralize } from '@/utils/format';
import styles from './ImportProgress.module.css';
import settingsStyles from './Settings.module.css';

interface ImportProgressProps {
  phase: ImportPhase;
  onConfirm: (result: ImportResult) => void;
  onReset: () => void;
}

/** Shows progress while matching, then a summary to confirm before anything is saved. */
export function ImportProgress({ phase, onConfirm, onReset }: ImportProgressProps) {
  switch (phase.step) {
    case 'idle':
      return null;

    case 'working':
      return (
        <div className={styles.working}>
          <div className={styles.bar}>
            <span style={{ width: phase.total ? `${(phase.done / phase.total) * 100}%` : '5%' }} />
          </div>
          <p className={settingsStyles.help}>
            Matching titles with TMDB… {phase.total > 0 && `${phase.done.toLocaleString()} / ${phase.total.toLocaleString()}`}
          </p>
        </div>
      );

    case 'saving':
      return <Spinner label="Saving" />;

    case 'done':
      return (
        <div className={styles.result}>
          <p className={`${settingsStyles.message} ${settingsStyles.success}`}>{phase.message}</p>
          <Button size="sm" variant="ghost" onClick={onReset}>
            Import something else
          </Button>
        </div>
      );

    case 'error':
      return (
        <div className={styles.result}>
          <p className={`${settingsStyles.message} ${settingsStyles.failure}`}>{phase.message}</p>
          <Button size="sm" variant="ghost" onClick={onReset}>
            Try again
          </Button>
        </div>
      );

    case 'preview':
      return <ImportSummary result={phase.result} onConfirm={onConfirm} onCancel={onReset} />;
  }
}

function ImportSummary({ result, onConfirm, onCancel }: { result: ImportResult; onConfirm: (result: ImportResult) => void; onCancel: () => void }) {
  const movies = result.items.filter((item) => item.media.mediaType === 'movie');
  const shows = result.items.filter((item) => item.media.mediaType === 'tv');
  const movieWatches = movies.reduce((total, item) => total + item.watches.length, 0);
  const episodes = shows.reduce((total, item) => total + item.watches.length, 0);
  const watchlist = result.items.filter((item) => item.status === 'watchlist').length;

  const stats = [
    { label: 'Movies', value: movies.length, detail: pluralize(movieWatches, 'viewing') },
    { label: 'TV shows', value: shows.length, detail: pluralize(episodes, 'episode') },
    { label: 'Watchlist', value: watchlist, detail: 'to watch' },
    { label: 'Not matched', value: result.unmatched.length, detail: 'skipped' },
  ];

  return (
    <div className={styles.summary}>
      <p className={styles.summaryTitle}>Ready to import — here's what we found:</p>
      <dl className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <dt>{stat.label}</dt>
            <dd>{stat.value.toLocaleString()}</dd>
            <span>{stat.detail}</span>
          </div>
        ))}
      </dl>

      {result.unmatched.length > 0 && (
        <details className={styles.details}>
          <summary>Show titles we couldn't match ({result.unmatched.length})</summary>
          <ul>
            {[...new Set(result.unmatched)].slice(0, 200).map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </details>
      )}
      {result.skippedFiles.length > 0 && (
        <p className={settingsStyles.help}>Skipped files we didn't recognise: {result.skippedFiles.join(', ')}</p>
      )}
      <p className={settingsStyles.help}>
        Already-tracked episodes and movies logged on the same day are skipped, so importing the same file twice is safe.
      </p>

      <div className={settingsStyles.row}>
        <Button variant="primary" onClick={() => onConfirm(result)} disabled={result.items.length === 0}>
          <Download size={17} /> Import {pluralize(result.items.length, 'title')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          <X size={17} /> Cancel
        </Button>
      </div>
    </div>
  );
}
