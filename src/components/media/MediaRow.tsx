import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, type ReactNode, type Ref } from 'react';
import { Link } from 'react-router';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { MediaSummary } from '@/types/media';
import { MediaCard } from './MediaCard';
import styles from './MediaRow.module.css';

interface MediaRowProps {
  title: string;
  subtitle?: string;
  items: MediaSummary[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  seeAllTo?: string;
  /** Extra controls in the header (e.g. a delete button for custom lists). */
  actions?: ReactNode;
  /** Shown instead of the row when there's nothing to show. */
  empty?: ReactNode;
  sectionRef?: Ref<HTMLElement>;
}

const SKELETON_COUNT = 8;

/** A titled, horizontally scrolling row of poster cards (Netflix-style). */
export function MediaRow({ title, subtitle, items, isLoading, error, seeAllTo, actions, empty, sectionRef }: MediaRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    track?.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  };

  const hasItems = Boolean(items?.length);

  return (
    <section className={styles.row} ref={sectionRef}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.controls}>
          {actions}
          {seeAllTo && (
            <Link to={seeAllTo} className={styles.seeAll}>
              See all
            </Link>
          )}
          {hasItems && (
            <>
              <button type="button" className={styles.arrow} onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" className={styles.arrow} onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}>
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      {error ? (
        <ErrorMessage error={error} />
      ) : isLoading || !items ? (
        <div className={styles.track} aria-busy>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div key={index} className={styles.item}>
              <div className={styles.skeleton} />
            </div>
          ))}
        </div>
      ) : !hasItems ? (
        empty
      ) : (
        <div ref={trackRef} className={styles.track}>
          {items.map((media) => (
            <div key={`${media.mediaType}-${media.id}`} className={styles.item}>
              <MediaCard media={media} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
