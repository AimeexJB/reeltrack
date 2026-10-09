import { AlertTriangle } from 'lucide-react';
import { TmdbError } from '@/api/tmdb';
import styles from './ErrorMessage.module.css';

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof TmdbError || error instanceof Error ? error.message : 'Something went wrong. Please try again.';

  return (
    <div className={styles.error} role="alert">
      <AlertTriangle size={18} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className={styles.retry}>
          Retry
        </button>
      )}
    </div>
  );
}
