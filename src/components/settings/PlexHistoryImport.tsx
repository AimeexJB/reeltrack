import { Link2, LogIn, Server } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useImportFlow } from '@/hooks/useImportFlow';
import { findServerAddress, getPlexServers, getPlexUsername, signInWithPlex, type PlexServer } from '@/services/importers/plexAuth';
import { getPlexAccounts, importPlexHistory, importPlexWatchedItems, type PlexAccount, type PlexConnection } from '@/services/importers/plex';
import { ImportProgress } from './ImportProgress';
import styles from './Settings.module.css';

type Step =
  | { name: 'start' }
  | { name: 'signing-in'; authUrl?: string; popupBlocked?: boolean }
  | { name: 'pick-server'; servers: PlexServer[]; username: string }
  | { name: 'connecting' }
  | { name: 'ready'; connection: PlexConnection; accounts: PlexAccount[]; serverName: string }
  /** Not the server owner — use your own watched marks instead of the server's history log. */
  | { name: 'ready-shared'; connection: PlexConnection; serverName: string };

/** One-off import of a Plex server's watch history. Sign in with Plex, or enter the details by hand. */
export function PlexHistoryImport() {
  const [step, setStep] = useState<Step>({ name: 'start' });
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(1);
  const abort = useRef<AbortController | null>(null);
  const { phase, run, confirm, reset } = useImportFlow();

  const fail = (err: unknown, back: Step = { name: 'start' }) => {
    setError(err instanceof Error ? err.message : 'Something went wrong.');
    setStep(back);
  };

  /** Loads the server's user list, pre-selecting the signed-in Plex user if we know their name. */
  const loadAccounts = async (connection: PlexConnection, serverName: string, username = '') => {
    let accounts: PlexAccount[];
    try {
      accounts = await getPlexAccounts(connection);
    } catch {
      // Only owners can read the history log; shared users can still read their own watched marks.
      setStep({ name: 'ready-shared', connection, serverName });
      return;
    }
    const mine = accounts.find((account) => account.name.toLowerCase() === username.toLowerCase());
    setAccountId((mine ?? accounts[0])?.id ?? 1);
    setStep({ name: 'ready', connection, accounts, serverName });
  };

  const connectToServer = async (server: PlexServer, username: string, servers: PlexServer[]) => {
    setError(null);
    setStep({ name: 'connecting' });
    try {
      const serverUrl = await findServerAddress(server);
      await loadAccounts({ serverUrl, token: server.accessToken }, server.name, username);
    } catch (err) {
      fail(err, { name: 'pick-server', servers, username });
    }
  };

  const signIn = async () => {
    setError(null);
    setStep({ name: 'signing-in' });
    abort.current = new AbortController();
    try {
      const token = await signInWithPlex(abort.current.signal, (authUrl, popupBlocked) =>
        setStep({ name: 'signing-in', authUrl, popupBlocked }),
      );
      const [servers, username] = await Promise.all([getPlexServers(token), getPlexUsername(token).catch(() => '')]);
      if (servers.length === 0) throw new Error('Signed in, but no Plex servers were found on your account.');
      if (servers.length === 1) await connectToServer(servers[0], username, servers);
      else setStep({ name: 'pick-server', servers, username });
    } catch (err) {
      fail(err);
    }
  };

  const connectManually = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const connection = { serverUrl: String(form.get('serverUrl')).trim(), token: String(form.get('token')).trim() };
    setError(null);
    setStep({ name: 'connecting' });
    try {
      await loadAccounts(connection, 'your server');
    } catch (err) {
      fail(err);
    }
  };

  const importing = !(phase.step === 'idle' || phase.step === 'done' || phase.step === 'error');

  return (
    <div className={styles.sectionBody}>
      <h3 className={styles.subheading}>Import watch history</h3>
      <p className={styles.help}>
        Copies everything you’ve already watched on Plex into Reeltrack. Works with any Plex account — no Plex Pass needed. Run it
        again any time; anything already imported is skipped.
      </p>

      {step.name === 'start' && (
        <div className={styles.row}>
          <Button variant="primary" onClick={signIn}>
            <LogIn size={17} /> Sign in with Plex
          </Button>
        </div>
      )}

      {step.name === 'signing-in' && (
        <div className={styles.row}>
          <p className={styles.help}>
            {step.popupBlocked ? (
              <>Your browser blocked the pop-up. </>
            ) : (
              <>A Plex window has opened — sign in there and press <strong>Allow</strong>. </>
            )}
            {step.authUrl && (
              <a href={step.authUrl} target="_blank" rel="noreferrer">
                {step.popupBlocked ? 'Open the Plex sign-in page' : 'Window didn’t appear? Open it here'}
              </a>
            )}{' '}
            This page continues by itself once you’ve approved.
          </p>
          <Button variant="ghost" size="sm" onClick={() => abort.current?.abort()}>
            Cancel
          </Button>
        </div>
      )}

      {step.name === 'pick-server' && (
        <div className={styles.sectionBody}>
          <p className={styles.help}>Which server’s history should we import?</p>
          <div className={styles.row}>
            {step.servers.map((server) => (
              <Button key={server.id} onClick={() => connectToServer(server, step.username, step.servers)}>
                <Server size={17} /> {server.name}
                {!server.owned && ' (shared with you)'}
              </Button>
            ))}
          </div>
        </div>
      )}

      {step.name === 'connecting' && <p className={styles.help}>Connecting to your Plex server…</p>}

      {step.name === 'ready' && !importing && (
        <div className={styles.row}>
          <label className={styles.field}>
            Connected to {step.serverName}. Whose history? (Plex keeps history for everyone who uses the server)
            <select className="select" value={accountId} onChange={(event) => setAccountId(Number(event.target.value))}>
              {step.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="primary" onClick={() => run((onProgress) => importPlexHistory(step.connection, accountId, onProgress))}>
            Read history
          </Button>
        </div>
      )}

      {step.name === 'ready-shared' && !importing && (
        <div className={styles.sectionBody}>
          <p className={styles.help}>
            Connected to <strong>{step.serverName}</strong>. You’re not this server’s owner, so Plex won’t share its full history log — but
            it does remember everything <em>you’ve</em> marked as watched. We’ll import that instead.
          </p>
          <p className={styles.help}>
            Good to know: Plex only keeps the <strong>most recent</strong> watch date for each title, so rewatches and exact dates for
            older viewings won’t come across, and anything since removed from the server can’t be found.
          </p>
          <div className={styles.row}>
            <Button variant="primary" onClick={() => run((onProgress) => importPlexWatchedItems(step.connection, onProgress))}>
              Read my watched items
            </Button>
          </div>
        </div>
      )}

      {error && <p className={`${styles.message} ${styles.failure}`}>{error}</p>}
      <ImportProgress phase={phase} onConfirm={confirm} onReset={reset} />

      {step.name === 'start' && (
        <details className={styles.help}>
          <summary>Sign-in not working? Enter your server details manually</summary>
          <ol>
            <li>
              <strong>Server address:</strong> <code>http://127.0.0.1:32400</code> if Plex Media Server runs on this computer, otherwise{' '}
              <code>http://&lt;that computer’s local IP&gt;:32400</code>.
            </li>
            <li>
              <strong>Token, option A (Plex in a web browser):</strong> go to <code>app.plex.tv</code> in Chrome/Safari (not the Plex
              app), open any movie → <strong>⋯ → Get Info → View XML</strong> (bottom-left of the info box). Copy the text after{' '}
              <code>X-Plex-Token=</code> in the new tab’s address bar.
            </li>
            <li>
              <strong>Token, option B (server runs on this Mac):</strong> in Terminal run{' '}
              <code>defaults read com.plexapp.plexmediaserver PlexOnlineToken</code> and copy what it prints.
            </li>
          </ol>
          <form className={styles.row} onSubmit={connectManually}>
            <label className={styles.field}>
              Server address
              <input className="input" name="serverUrl" defaultValue="http://127.0.0.1:32400" required />
            </label>
            <label className={styles.field}>
              Plex token
              <input className="input" name="token" type="password" autoComplete="off" required />
            </label>
            <Button type="submit">
              <Link2 size={17} /> Connect
            </Button>
          </form>
          <p>Your token is only used for this import and is never saved.</p>
        </details>
      )}
    </div>
  );
}
