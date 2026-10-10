import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import styles from './LoginPage.module.css';

/**
 * One page for every password job:
 *  - arriving from an invite or "reset password" email → choose a password
 *  - signed in → change your password
 *  - signed out → "Forgot password?" (emails a reset link here)
 */
export default function ResetPasswordPage() {
  const { user, initializing, needsPassword, authLinkError, supportsPasswordReset } = useAuth();

  if (initializing) return <Spinner />;
  if (!supportsPasswordReset) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Passwords</h1>
          <p className={styles.subtitle}>Password resets need cloud accounts (Supabase). Browser-only accounts can’t be reset.</p>
        </div>
      </div>
    );
  }
  if (user && !authLinkError) return <SetPasswordForm isNewAccount={needsPassword} />;
  return <RequestResetForm linkError={authLinkError} />;
}

function SetPasswordForm({ isNewAccount }: { isNewAccount: boolean }) {
  const { user, setPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) return setError('The passwords don’t match.');
    setError(null);
    setSaving(true);
    try {
      await setPassword(password);
      navigate(paths.profile, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{isNewAccount ? 'Set your password' : 'Change password'}</h1>
        <p className={styles.subtitle}>
          {isNewAccount
            ? `Welcome${user ? `, ${user.displayName}` : ''}! Choose a password so you can log in any time.`
            : 'Choose a new password for your account.'}
        </p>

        <label className={styles.field}>
          <span>New password</span>
          <input className="input" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPasswordValue(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Confirm password</span>
          <input className="input" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save password'}
        </Button>
        {!isNewAccount && (
          <p className={styles.switch}>
            <Link to={paths.profile}>Cancel</Link>
          </p>
        )}
      </form>
    </div>
  );
}

function RequestResetForm({ linkError }: { linkError: string | null }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send the email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>Enter your email and we’ll send you a link to choose a new password.</p>

        {linkError && (
          <p className={styles.error} role="alert">
            {linkError}
          </p>
        )}

        {sent ? (
          <p className={styles.notice} role="status">
            If an account exists for {email}, a reset link is on its way. Open it on this device, then choose your new password.
          </p>
        ) : (
          <>
            <label className={styles.field}>
              <span>Email</span>
              <input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        )}

        <p className={styles.switch}>
          <Link to={paths.login}>Back to log in</Link>
        </p>
      </form>
    </div>
  );
}
