import { Library } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PaginatedMediaGrid } from '@/components/media/PaginatedMediaGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { MEDIA_TYPE_LABELS, STATUS_LABELS } from '@/constants/tracking';
import type { MediaType } from '@/types/media';
import type { LibraryEntry, TrackStatus } from '@/types/user';
import styles from './ProfileSection.module.css';

const STATUSES: TrackStatus[] = ['watchlist', 'watching', 'completed'];

interface LibraryShelvesProps {
  library: Record<string, LibraryEntry>;
  mediaType: MediaType;
}

/** One media type's tracked titles (Movies or TV Shows), split into Watchlist / Watching / Completed. */
export function LibraryShelves({ library, mediaType }: LibraryShelvesProps) {
  const [status, setStatus] = useState<TrackStatus>('watchlist');

  const entries = useMemo(
    () =>
      Object.values(library)
        .filter((entry) => entry.media.mediaType === mediaType)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [library, mediaType],
  );

  const items = entries.filter((entry) => entry.status === status).map((entry) => entry.media);
  const typeLabel = MEDIA_TYPE_LABELS[mediaType].plural;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{typeLabel}</h2>
        <Tabs
          label={`${typeLabel} status`}
          value={status}
          onChange={setStatus}
          options={STATUSES.map((value) => ({
            value,
            label: STATUS_LABELS[value],
            count: entries.filter((entry) => entry.status === value).length,
          }))}
        />
      </div>
      {items.length > 0 ? (
        // `key` sends you back to page 1 when switching tabs.
        <PaginatedMediaGrid key={status} items={items} label={`${typeLabel} ${STATUS_LABELS[status]} pages`} />
      ) : (
        <EmptyState
          icon={Library}
          title={`No ${mediaType === 'tv' ? 'TV shows' : 'movies'} in ${STATUS_LABELS[status]} yet`}
          description="Use the buttons on any title (or the + on a poster) to add it here."
        />
      )}
    </section>
  );
}
