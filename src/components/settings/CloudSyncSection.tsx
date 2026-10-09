import { Cloud, CloudOff, MoveRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import { findLocalAccounts, markLocalAccountMigrated, type LocalAccountData } from '@/services/local/localAccounts';
import { pluralize } from '@/utils/format';
import { SettingsSection } from './SettingsSection';
import styles from './Settings.module.css';

export function CloudSyncSection() {
  const { backend } = useAuth();
  const isCloud = backend === 'supabase';

  return (
    <SettingsSection
      icon={isCloud ? Cloud : CloudOff}
      title="Cloud sync"
      description={
        isCloud
          ? 'Your library is saved to your Supabase database, so it follows you to any browser or device you log in from.'
          : 'Your library is currently saved in this browser only. It survives restarts, but not clearing site data, and it won’t appear on other devices.'
      }
    >
      <p className={`${styles.status} ${isCloud ? styles.statusOn : styles.statusOff}`}>
        {isCloud ? <Cloud size={18} /> : <CloudOff size={18} />} {isCloud ? 'Cloud sync is on' : 'Browser only'}
      </p>
      {isCloud ? (
        <LocalDataMigration />
      ) : (
        <p className={styles.help}>
          To turn on cloud sync, follow <code>SUPABASE_SETUP.md</code> in the project folder. Download a backup first (below) — or simply
          log into your new cloud account in this browser and you'll be offered to move this data across.
        </p>
      )}
    </SettingsSection>
  );
}

/** After switching to Supabase, offer to move data from the old browser-only accounts. */
function LocalDataMigration() {
  const { mergeData } = useLibrary();
  const [accounts, setAccounts] = useState<LocalAccountData[]>(() => findLocalAccounts());
  const [message, setMessage] = useState<string | null>(null);

  const migrate = async (account: LocalAccountData) => {
    await mergeData(account.data);
    markLocalAccountMigrated(account.userId);
    setAccounts(findLocalAccounts());
    setMessage(`Moved @${account.username}'s data into your cloud account.`);
  };

  if (accounts.length === 0) return message ? <p className={`${styles.message} ${styles.success}`}>{message}</p> : null;

  return (
    <>
      <p className={styles.help}>We found data from a browser-only account. Move it into your cloud account so it isn't lost:</p>
      {accounts.map((account) => (
        <div key={account.userId} className={styles.accountCard}>
          <span>
            <strong>@{account.username}</strong> — {pluralize(Object.keys(account.data.library).length, 'title')},{' '}
            {pluralize(account.data.watches.length, 'viewing')}, {pluralize(account.data.lists.length, 'list')}
          </span>
          <Button variant="primary" size="sm" onClick={() => migrate(account)}>
            <MoveRight size={15} /> Move to cloud
          </Button>
        </div>
      ))}
    </>
  );
}
