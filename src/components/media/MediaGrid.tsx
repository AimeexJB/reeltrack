import type { Ref } from 'react';
import type { MediaSummary } from '@/types/media';
import { MediaCard } from './MediaCard';
import styles from './MediaGrid.module.css';

interface MediaGridProps {
  items: MediaSummary[];
  ref?: Ref<HTMLDivElement>;
}

/** Responsive grid of poster cards (search results, browse pages, library shelves). */
export function MediaGrid({ items, ref }: MediaGridProps) {
  return (
    <div ref={ref} className={styles.grid}>
      {items.map((media) => (
        <MediaCard key={`${media.mediaType}-${media.id}`} media={media} />
      ))}
    </div>
  );
}
