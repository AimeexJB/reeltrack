import { Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { paths } from '@/constants/routes';
import type { ProfileChanges } from '@/services/types';
import type { User } from '@/types/user';
import { resizeImageToDataUrl } from '@/utils/image';
import { DISPLAY_NAME_MAX, normalizeUsername, USERNAME_RULES, validateDisplayName, validateUsername } from '@/utils/validation';
import styles from './EditProfileModal.module.css';

const TITLE_ID = 'edit-profile-title';

interface EditProfileModalProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export function EditProfileModal({ user, open, onClose }: EditProfileModalProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy={TITLE_ID}>
      {/* `key` resets the form to the saved values each time it opens. */}
      {open && <EditProfileForm key={String(open)} user={user} onDone={onClose} />}
    </Modal>
  );
}

function EditProfileForm({ user, onDone }: { user: User; onDone: () => void }) {
  const { updateProfile, supportsPasswordReset } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setError(null);
      setAvatarUrl(await resizeImageToDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t read that image.');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateDisplayName(displayName) ?? validateUsername(username);
    if (validationError) return setError(validationError);

    // Only send what actually changed.
    const changes: ProfileChanges = {};
    if (avatarUrl !== user.avatarUrl) changes.avatarUrl = avatarUrl;
    if (displayName.trim() !== user.displayName) changes.displayName = displayName.trim();
    if (normalizeUsername(username) !== user.username) changes.username = normalizeUsername(username);
    if (Object.keys(changes).length === 0) return onDone();

    setSaving(true);
    setError(null);
    try {
      await updateProfile(changes);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 id={TITLE_ID} className={styles.title}>
        Edit profile
      </h2>

      <div className={styles.photoRow}>
        <Avatar name={displayName.trim() || user.displayName} src={avatarUrl} size={88} />
        <div className={styles.photoActions}>
          <Button size="sm" onClick={() => fileInput.current?.click()}>
            <Upload size={15} /> {avatarUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          {avatarUrl && (
            <Button size="sm" variant="ghost" onClick={() => setAvatarUrl(null)}>
              <Trash2 size={15} /> Remove
            </Button>
          )}
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={handlePhoto} />
        </div>
      </div>

      <label className={styles.field}>
        <span>Display name</span>
        <input className="input" value={displayName} maxLength={DISPLAY_NAME_MAX} onChange={(event) => setDisplayName(event.target.value)} required />
      </label>

      <label className={styles.field}>
        <span>Username</span>
        <div className={styles.usernameInput}>
          <span className={styles.at}>@</span>
          <input
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            autoComplete="username"
            spellCheck={false}
            required
          />
        </div>
        <small className={styles.hint}>{USERNAME_RULES}</small>
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        {supportsPasswordReset && (
          <Link to={paths.resetPassword} className={styles.passwordLink} onClick={onDone}>
            Change password
          </Link>
        )}
        <Button variant="ghost" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
