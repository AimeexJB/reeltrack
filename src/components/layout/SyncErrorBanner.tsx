import { CloudAlert, X } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import styles from './SyncErrorBanner.module.css';

/** Appears if a change couldn't be saved (e.g. offline). */
export function SyncErrorBanner() {
  const { syncError, dismissSyncError } = useLibrary();
  if (!syncError) return null;

  return (
    <div className={styles.banner} role="alert">
      <CloudAlert size={18} />
      <span>{syncError}</span>
      <button type="button" onClick={dismissSyncError} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
