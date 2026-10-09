import { useRef, useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { useGridColumns } from '@/hooks/useGridColumns';
import type { MediaSummary } from '@/types/media';
import { MediaGrid } from './MediaGrid';
import styles from './PaginatedMediaGrid.module.css';

interface PaginatedMediaGridProps {
  items: MediaSummary[];
  /** Rows per page — the number of cards per page follows the screen width. */
  rows?: number;
  label: string;
}

/** A MediaGrid that shows a few full rows at a time, with page controls underneath. */
export function PaginatedMediaGrid({ items, rows = 2, label }: PaginatedMediaGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const columns = useGridColumns(gridRef);
  const [page, setPage] = useState(0);

  const pageSize = columns * rows;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Stay on a valid page if the screen widens or items are removed.
  const current = Math.min(page, pageCount - 1);
  const start = current * pageSize;

  return (
    <div>
      <MediaGrid ref={gridRef} items={items.slice(start, start + pageSize)} />
      {pageCount > 1 && (
        <>
          <Pagination page={current} pageCount={pageCount} onChange={setPage} label={label} />
          <p className={styles.range}>
            {start + 1}–{Math.min(start + pageSize, items.length)} of {items.length}
          </p>
        </>
      )}
    </div>
  );
}
