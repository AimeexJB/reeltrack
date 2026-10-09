import { SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { MediaGrid } from '@/components/media/MediaGrid';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchInput } from '@/components/search/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadMoreTrigger } from '@/components/ui/LoadMoreTrigger';
import { Spinner } from '@/components/ui/Spinner';
import { useSearchResults } from '@/hooks/useSearchResults';
import type { SearchFilters as Filters } from '@/types/search';
import { parseSearchFilters, serializeSearchFilters } from '@/utils/searchParams';
import styles from './SearchPage.module.css';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const filters = parseSearchFilters(params);
  const { query, items, totalResults } = useSearchResults(filters);

  const updateFilters = (changes: Partial<Filters>) => setParams(serializeSearchFilters({ ...filters, ...changes }), { replace: true });
  const resetFilters = () => setParams(filters.query ? { q: filters.query } : {}, { replace: true });

  return (
    <div>
      <h1 className={styles.title}>Search</h1>
      <SearchInput value={filters.query} onChange={(text) => updateFilters({ query: text })} />
      <SearchFilters filters={filters} onChange={updateFilters} onReset={resetFilters} />

      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 && !query.hasNextPage ? (
        <EmptyState icon={SearchX} title="No results" description="Try a different title or loosen your filters." />
      ) : (
        <>
          <p className={styles.summary}>
            {filters.query ? `Results for “${filters.query}”` : 'Browsing the full catalogue'}
            {!filters.query && totalResults > 0 && ` · ${totalResults.toLocaleString()} titles`}
          </p>
          <MediaGrid items={items} />
          <LoadMoreTrigger hasMore={query.hasNextPage} isLoading={query.isFetchingNextPage} onLoadMore={query.fetchNextPage} />
        </>
      )}
    </div>
  );
}
