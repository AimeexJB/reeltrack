import { Library } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PaginatedMediaGrid } from '@/components/media/PaginatedMediaGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { STATUS_LABELS } from '@/constants/tracking';
import type { MediaSummary } from '@/types/media';
import type { LibraryEntry, TrackStatus } from '@/types/user';
import { isAnime } from '@/utils/media';
import styles from './ProfileSection.module.css';

const STATUSES: TrackStatus[] = ['watchlist', 'watching', 'completed'];

/** Profile shelves: anime (series and movies) gets its own section, separate from movies and TV. */
export type LibraryCategory = 'movie' | 'tv' | 'anime';

const CATEGORIES: Record<LibraryCategory, { title: string; emptyName: string; matches: (media: MediaSummary) => boolean }> = {
  movie: { title: 'Movies', emptyName: 'movies', matches: (media) => media.mediaType === 'movie' && !isAnime(media) },
  tv: { title: 'TV Shows', emptyName: 'TV shows', matches: (media) => media.mediaType === 'tv' && !isAnime(media) },
  anime: { title: 'Anime', emptyName: 'anime', matches: isAnime },
};

interface LibraryShelvesProps {
  library: Record<string, LibraryEntry>;
  category: LibraryCategory;
}

/** One category's tracked titles (Movies, TV Shows or Anime), split into Watchlist / Watching / Completed. */
export function LibraryShelves({ library, category }: LibraryShelvesProps) {
  const [status, setStatus] = useState<TrackStatus>('watchlist');
  const { title, emptyName, matches } = CATEGORIES[category];

  const entries = useMemo(
    () =>
      Object.values(library)
        .filter((entry) => matches(entry.media))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [library, matches],
  );

  const items = entries.filter((entry) => entry.status === status).map((entry) => entry.media);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{title}</h2>
        <Tabs
          label={`${title} status`}
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
        <PaginatedMediaGrid key={status} items={items} label={`${title} ${STATUS_LABELS[status]} pages`} />
      ) : (
        <EmptyState
          icon={Library}
          title={`No ${emptyName} in ${STATUS_LABELS[status]} yet`}
          description="Use the buttons on any title (or the + on a poster) to add it here."
        />
      )}
    </section>
  );
}
