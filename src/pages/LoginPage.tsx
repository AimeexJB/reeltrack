import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { APP_NAME } from '@/constants/defaults';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import styles from './LoginPage.module.css';

type Mode = 'login' | 'register';

/** Online, sign-ups are invite-only (also enforced in Supabase). */
const SIGNUPS_ALLOWED = import.meta.env.VITE_ALLOW_SIGNUPS !== 'false';

export default function LoginPage() {
  const { user, initializing, backend, login, register } = useAuth();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? paths.home;
  // Supabase accounts sign in with an email address; browser-only accounts use a username.
  const usesEmail = backend === 'supabase';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (initializing) return <Spinner />;
  if (user) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(usesEmail ? email : username, password);
      } else {
        const { needsConfirmation } = await register({ email, username, password, displayName });
        if (needsConfirmation) {
          setNotice(`Almost there — we've emailed a confirmation link to ${email}. Click it, then log in here.`);
          setMode('login');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setNotice(null);
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{mode === 'login' ? 'Welcome back' : `Join ${APP_NAME}`}</h1>
        <p className={styles.subtitle}>
          {mode === 'login' ? 'Log in to track what you watch.' : 'Track every movie and episode in one place.'}
        </p>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {usesEmail && (
          <label className={styles.field}>
            <span>Email</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
        )}

        {(!usesEmail || mode === 'register') && (
          <label className={styles.field}>
            <span>Username</span>
            <input className="input" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
        )}

        {mode === 'register' && (
          <label className={styles.field}>
            <span>Display name</span>
            <input className="input" autoComplete="nickname" placeholder="Optional" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        )}

        <label className={styles.field}>
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 6 : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </Button>

        {SIGNUPS_ALLOWED ? (
          <p className={styles.switch}>
            {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
            <button type="button" onClick={switchMode}>
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
        ) : (
          <p className={styles.switch}>Reeltrack is invite only.</p>
        )}

        <p className={styles.note}>
          {usesEmail ? 'Synced to the cloud — log in from any device.' : 'Accounts are stored in this browser only.'}
        </p>
      </form>
    </div>
  );
}
