import { Check, Copy, MonitorPlay, RefreshCw } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  getPlexWebhookSettings,
  regeneratePlexWebhookToken,
  savePlexUsername,
  type PlexWebhookSettings,
} from '@/services/supabase/plexSettings';
import { PlexHistoryImport } from './PlexHistoryImport';
import { SettingsSection } from './SettingsSection';
import styles from './Settings.module.css';

export function PlexSection() {
  const { backend } = useAuth();

  return (
    <SettingsSection
      icon={MonitorPlay}
      title="Plex"
      description="Import what you've already watched on Plex, and (with Plex Pass + cloud sync) log new viewings automatically."
    >
      <PlexHistoryImport />
      <hr className={styles.divider} />
      {backend === 'supabase' ? (
        <PlexAutoSync />
      ) : (
        <div>
          <h3 className={styles.subheading}>Automatic sync</h3>
          <p className={styles.help}>
            Plex can tell Reeltrack every time you finish something, but it needs a public web address to send that to — which comes with
            cloud sync. Set up Supabase (see <code>SUPABASE_SETUP.md</code>) and this option will appear here.
          </p>
        </div>
      )}
    </SettingsSection>
  );
}

/** Webhook settings: Plex Pass sends a "scrobble" event to this URL whenever you finish something. */
function PlexAutoSync() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlexWebhookSettings | null>(null);
  const [plexUsername, setPlexUsername] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async (userId: string) => {
    try {
      const loaded = await getPlexWebhookSettings(userId);
      setSettings(loaded);
      setPlexUsername(loaded.plexUsername);
    } catch (error) {
      setMessage({ ok: false, text: `Couldn’t load Plex settings: ${error instanceof Error ? error.message : 'unknown error'}` });
    }
  };

  useEffect(() => {
    if (user) load(user.id);
  }, [user]);

  if (!user) return null;

  const copy = async () => {
    if (!settings) return;
    await navigator.clipboard.writeText(settings.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveUsername = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await savePlexUsername(user.id, plexUsername);
      setMessage({ ok: true, text: plexUsername.trim() ? `Only ${plexUsername.trim()}'s viewings will be logged.` : 'All viewings on your server will be logged.' });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Save failed.' });
    }
  };

  const regenerate = async () => {
    if (!window.confirm('Create a new webhook URL? The old one will stop working, so you’ll need to paste the new one into Plex.')) return;
    await regeneratePlexWebhookToken();
    await load(user.id);
  };

  return (
    <div className={styles.sectionBody}>
      <h3 className={styles.subheading}>Automatic sync (Plex Pass)</h3>
      <div className={styles.help}>
        <ol>
          <li>Copy your personal webhook URL below. Keep it private — anyone with it can log viewings to your account.</li>
          <li>
            In Plex go to <strong>Settings → Webhooks → Add Webhook</strong>, paste it, and save.
          </li>
          <li>Finish watching something (Plex counts ~90% as watched) — it'll appear in your stats within seconds.</li>
        </ol>
      </div>

      {settings && (
        <div className={styles.copyRow}>
          <input className="input" readOnly value={settings.webhookUrl} aria-label="Plex webhook URL" onFocus={(event) => event.target.select()} />
          <Button onClick={copy}>
            {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" onClick={regenerate} aria-label="Create a new webhook URL" title="Create a new URL">
            <RefreshCw size={17} />
          </Button>
        </div>
      )}

      <form className={styles.row} onSubmit={saveUsername}>
        <label className={styles.field}>
          Your Plex username (recommended if others use your server — their viewings will be ignored)
          <input className="input" value={plexUsername} onChange={(event) => setPlexUsername(event.target.value)} placeholder="Leave blank to log everyone" />
        </label>
        <Button type="submit">Save</Button>
      </form>
      {message && <p className={`${styles.message} ${message.ok ? styles.success : styles.failure}`}>{message.text}</p>}
    </div>
  );
}
