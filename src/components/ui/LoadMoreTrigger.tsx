import { useEffect } from 'react';
import { useInView } from '@/hooks/useInView';
import { Spinner } from './Spinner';

interface LoadMoreTriggerProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

/** Invisible marker at the bottom of a grid — loads the next page when it scrolls into view. */
export function LoadMoreTrigger({ hasMore, isLoading, onLoadMore }: LoadMoreTriggerProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '600px', once: false });

  useEffect(() => {
    if (inView && hasMore && !isLoading) onLoadMore();
  }, [inView, hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;
  return <div ref={ref}>{isLoading && <Spinner label="Loading more" />}</div>;
}
