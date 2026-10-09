import { FileUp } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useImportFlow } from '@/hooks/useImportFlow';
import { importFiles } from '@/services/importers/fileImport';
import { ImportProgress } from './ImportProgress';
import { SettingsSection } from './SettingsSection';
import styles from './Settings.module.css';

export function FileImportSection() {
  const { phase, run, confirm, reset } = useImportFlow();

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length) run((onProgress) => importFiles(files, onProgress));
  };

  return (
    <SettingsSection
      icon={FileUp}
      title="Import from IMDb & TV Time"
      description="Bring in your history from CSV exports. You'll see a summary before anything is added."
    >
      <div className={styles.help}>
        <strong>IMDb</strong>
        <ol>
          <li>
            On imdb.com open <strong>Your Ratings</strong> (and/or your <strong>Watchlist</strong>).
          </li>
          <li>
            Press the <strong>⋯</strong> menu → <strong>Export</strong>, then download the CSV from <strong>Your exports</strong>.
          </li>
          <li>Rated movies become watched on the date you rated them; your watchlist becomes your watchlist.</li>
        </ol>
      </div>
      <div className={styles.help}>
        <strong>TV Time</strong>
        <ol>
          <li>
            Request your data from TV Time (in the app: <strong>Settings → Privacy / Personal data</strong>, or by emailing TV Time support
            asking for a GDPR data export).
          </li>
          <li>
            Unzip what they send and select the CSV files — especially <code>seen_episode.csv</code> and <code>followed_tv_show.csv</code>.
            Other files are ignored if they aren't recognised.
          </li>
        </ol>
      </div>

      {(phase.step === 'idle' || phase.step === 'done' || phase.step === 'error') && (
        <label className={styles.field}>
          Choose CSV files (you can select several at once)
          <input type="file" accept=".csv,text/csv" multiple className={styles.fileInput} onChange={handleFiles} />
        </label>
      )}
      <ImportProgress phase={phase} onConfirm={confirm} onReset={reset} />
    </SettingsSection>
  );
}
