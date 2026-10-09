import { DownloadCloud, HardDriveDownload, Upload } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useLibrary } from '@/context/LibraryContext';
import { exportBackup, readBackup } from '@/services/backup';
import type { UserData } from '@/types/user';
import { pluralize } from '@/utils/format';
import { SettingsSection } from './SettingsSection';
import styles from './Settings.module.css';

const describe = (data: UserData) =>
  `${pluralize(Object.keys(data.library).length, 'title')}, ${pluralize(data.watches.length, 'viewing')} and ${pluralize(data.lists.length, 'list')}`;

export function BackupSection() {
  const { data, mergeData } = useLibrary();
  const [pending, setPending] = useState<{ fileName: string; data: UserData } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    try {
      setPending({ fileName: file.name, data: await readBackup(file) });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Couldn’t read that file.' });
    }
  };

  const restore = async () => {
    if (!pending) return;
    try {
      await mergeData(pending.data);
      setMessage({ ok: true, text: `Restored ${describe(pending.data)} from ${pending.fileName}.` });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Restore failed.' });
    }
    setPending(null);
  };

  return (
    <SettingsSection
      icon={HardDriveDownload}
      title="Backup"
      description="Download everything you've tracked as a file, and restore it any time — on this browser, another browser, or a cloud account."
    >
      <div className={styles.row}>
        <Button variant="primary" onClick={() => exportBackup(data)}>
          <DownloadCloud size={17} /> Download backup
        </Button>
        <label className={styles.field}>
          Restore from a backup file
          <input type="file" accept=".json,application/json" className={styles.fileInput} onChange={handleFile} />
        </label>
      </div>
      <p className={styles.help}>Your library right now: {describe(data)}.</p>

      {pending && (
        <div className={styles.accountCard}>
          <span>
            <strong>{pending.fileName}</strong> contains {describe(pending.data)}. It will be merged with your current library — nothing is deleted.
          </span>
          <div className={styles.row}>
            <Button variant="primary" size="sm" onClick={restore}>
              <Upload size={15} /> Restore
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {message && <p className={`${styles.message} ${message.ok ? styles.success : styles.failure}`}>{message.text}</p>}
    </SettingsSection>
  );
}
