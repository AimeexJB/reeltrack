import { KeyRound } from 'lucide-react';
import styles from './ConfigBanner.module.css';

/** Shown when no TMDB token is configured — explains the one setup step. */
export function ConfigBanner() {
  return (
    <div className={styles.banner}>
      <KeyRound size={20} />
      <div>
        <strong>Connect TMDB to load movies & shows.</strong>
        <p>
          Create a free account at{' '}
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
            themoviedb.org/settings/api
          </a>
          , copy <code>.env.example</code> to <code>.env</code>, paste your API Read Access Token into{' '}
          <code>VITE_TMDB_TOKEN</code>, then restart <code>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}
