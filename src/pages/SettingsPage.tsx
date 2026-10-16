import { BackupSection } from '@/components/settings/BackupSection';
import { CloudSyncSection } from '@/components/settings/CloudSyncSection';
import { FileImportSection } from '@/components/settings/FileImportSection';
import { PlexSection } from '@/components/settings/PlexSection';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Spinner } from '@/components/ui/Spinner';
import { paths } from '@/constants/routes';
import { useLibrary } from '@/context/LibraryContext';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { loaded } = useLibrary();

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', to: paths.home }, { label: 'My Profile', to: paths.profile }, { label: 'Import & Sync' }]} className={styles.breadcrumbs} />
      <header className={styles.header}>
        <h1 className={styles.title}>Import & Sync</h1>
        <p className={styles.subtitle}>Back up your data, bring in your history from other apps, and connect Plex.</p>
      </header>
      {loaded ? (
        <>
          <CloudSyncSection />
          <BackupSection />
          <FileImportSection />
          <PlexSection />
        </>
      ) : (
        <Spinner />
      )}
    </div>
  );
}
