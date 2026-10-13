import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { Button } from '@/components/ui/Button';
import { isChunkLoadError, reloadForNewVersion } from '@/utils/appVersion';
import styles from './RouteError.module.css';

/**
 * Shown instead of React Router's bare "Unexpected Application Error".
 * If the problem is an out-of-date tab after a new deploy, it quietly reloads to the latest version.
 */
export function RouteError() {
  const error = useRouteError();
  const outdated = isChunkLoadError(error);

  useEffect(() => {
    if (outdated) reloadForNewVersion();
  }, [outdated]);

  return (
    <div className={styles.page}>
      <div className={styles.card} role="alert">
        <h1 className={styles.title}>{outdated ? 'Updating Reeltrack…' : 'Something went wrong'}</h1>
        <p className={styles.text}>
          {outdated
            ? 'A newer version was released since this page was opened. Reloading to get it.'
            : 'Sorry — this page hit an unexpected problem. Reloading usually fixes it.'}
        </p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Reload
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign(import.meta.env.BASE_URL)}>
            Go to home
          </Button>
        </div>
      </div>
    </div>
  );
}
