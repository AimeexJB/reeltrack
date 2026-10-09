import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

interface PaginationProps {
  /** Zero-based. */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  label: string;
}

/** Page numbers with previous/next, collapsing long ranges: 1 … 4 5 6 … 12 */
function visiblePages(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index);
  const pages = new Set([0, pageCount - 1, page - 1, page, page + 1].filter((value) => value >= 0 && value < pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1] > 1 ? ['gap' as const, value] : [value]));
}

export function Pagination({ page, pageCount, onChange, label }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label={label}>
      <button type="button" className={styles.arrow} onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Previous page">
        <ChevronLeft size={18} />
      </button>
      {visiblePages(page, pageCount).map((value, index) =>
        value === 'gap' ? (
          <span key={`gap-${index}`} className={styles.gap}>
            …
          </span>
        ) : (
          <button
            key={value}
            type="button"
            className={styles.page}
            aria-current={value === page ? 'page' : undefined}
            onClick={() => onChange(value)}
          >
            {value + 1}
          </button>
        ),
      )}
      <button type="button" className={styles.arrow} onClick={() => onChange(page + 1)} disabled={page === pageCount - 1} aria-label="Next page">
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
