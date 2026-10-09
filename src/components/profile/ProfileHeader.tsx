import { Camera, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useLibrary } from '@/context/LibraryContext';
import type { User } from '@/types/user';
import { formatDate } from '@/utils/date';
import { minutesToHours } from '@/utils/format';
import { EditProfileModal } from './EditProfileModal';
import styles from './ProfileHeader.module.css';

export function ProfileHeader({ user }: { user: User }) {
  const { data } = useLibrary();
  const [editing, setEditing] = useState(false);

  const totalMinutes = data.watches.reduce((total, watch) => total + watch.runtime, 0);
  const totals = [
    { label: 'Hours watched', value: minutesToHours(totalMinutes) },
    { label: 'Movies', value: data.watches.filter((watch) => watch.mediaType === 'movie').length },
    { label: 'Episodes', value: data.watches.filter((watch) => watch.mediaType === 'tv').length },
    { label: 'Lists', value: data.lists.length },
  ];

  return (
    <section className={styles.header}>
      <button type="button" className={styles.avatarButton} onClick={() => setEditing(true)} aria-label="Edit profile picture">
        <Avatar name={user.displayName} src={user.avatarUrl} size={96} />
        <span className={styles.avatarOverlay}>
          <Camera size={22} />
        </span>
      </button>

      <div className={styles.identity}>
        <h1 className={styles.name}>{user.displayName}</h1>
        <p className={styles.meta}>
          @{user.username} · Member since {formatDate(user.createdAt, { month: 'long', year: 'numeric' })}
        </p>
        <Button size="sm" onClick={() => setEditing(true)} className={styles.editButton}>
          <Pencil size={14} /> Edit profile
        </Button>
      </div>

      <dl className={styles.totals}>
        {totals.map((total) => (
          <div key={total.label} className={styles.total}>
            <dt>{total.label}</dt>
            <dd>{total.value}</dd>
          </div>
        ))}
      </dl>

      <EditProfileModal user={user} open={editing} onClose={() => setEditing(false)} />
    </section>
  );
}
