import { Camera } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import type { User } from '@/types/user';
import { formatDate } from '@/utils/date';
import { minutesToHours } from '@/utils/format';
import { resizeImageToDataUrl } from '@/utils/image';
import styles from './ProfileHeader.module.css';

export function ProfileHeader({ user }: { user: User }) {
  const { updateProfile } = useAuth();
  const { data } = useLibrary();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const totalMinutes = data.watches.reduce((total, watch) => total + watch.runtime, 0);
  const totals = [
    { label: 'Hours watched', value: minutesToHours(totalMinutes) },
    { label: 'Movies', value: data.watches.filter((watch) => watch.mediaType === 'movie').length },
    { label: 'Episodes', value: data.watches.filter((watch) => watch.mediaType === 'tv').length },
    { label: 'Lists', value: data.lists.length },
  ];

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadError(null);
      await updateProfile({ avatarUrl: await resizeImageToDataUrl(file) });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    }
    event.target.value = '';
  };

  return (
    <section className={styles.header}>
      <button type="button" className={styles.avatarButton} onClick={() => fileInput.current?.click()} aria-label="Change profile picture">
        <Avatar name={user.displayName} src={user.avatarUrl} size={96} />
        <span className={styles.avatarOverlay}>
          <Camera size={22} />
        </span>
      </button>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleAvatarChange} />

      <div className={styles.identity}>
        <h1 className={styles.name}>{user.displayName}</h1>
        <p className={styles.meta}>
          @{user.username} · Member since {formatDate(user.createdAt, { month: 'long', year: 'numeric' })}
        </p>
        {uploadError && <p className={styles.error}>{uploadError}</p>}
      </div>

      <dl className={styles.totals}>
        {totals.map((total) => (
          <div key={total.label} className={styles.total}>
            <dt>{total.label}</dt>
            <dd>{total.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
