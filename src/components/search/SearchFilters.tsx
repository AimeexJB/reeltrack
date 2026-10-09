import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { getGenres } from '@/constants/genres';
import type { MediaTypeFilter, SearchFilters as Filters, SortOption } from '@/types/search';
import styles from './SearchFilters.module.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 2 - 1930 }, (_, index) => CURRENT_YEAR + 1 - index);
const RATINGS = [5, 6, 7, 8, 9];
const SORT_LABELS: Record<SortOption, string> = {
  popularity: 'Most popular',
  rating: 'Highest rated',
  newest: 'Newest',
};

interface SearchFiltersProps {
  filters: Filters;
  onChange: (changes: Partial<Filters>) => void;
  onReset: () => void;
}

/** Turns an empty <select> value into `undefined`, otherwise a number. */
const optionalNumber = (value: string) => (value ? Number(value) : undefined);

export function SearchFilters({ filters, onChange, onReset }: SearchFiltersProps) {
  const genres = getGenres(filters.mediaType);
  const hasActiveFilters = Boolean(filters.genreId || filters.year || filters.minRating || filters.sort !== 'popularity' || filters.mediaType !== 'all');

  return (
    <div className={styles.filters}>
      <Tabs<MediaTypeFilter>
        label="Media type"
        value={filters.mediaType}
        // Genre ids differ between movies and TV, so reset genre when switching type.
        onChange={(mediaType) => onChange({ mediaType, genreId: undefined })}
        options={[
          { value: 'all', label: 'All' },
          { value: 'movie', label: 'Movies' },
          { value: 'tv', label: 'TV Shows' },
        ]}
      />

      <div className={styles.selects}>
        <label className={styles.field}>
          <span>Genre</span>
          <select className="select" value={filters.genreId ?? ''} onChange={(event) => onChange({ genreId: optionalNumber(event.target.value) })}>
            <option value="">Any genre</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Year</span>
          <select className="select" value={filters.year ?? ''} onChange={(event) => onChange({ year: optionalNumber(event.target.value) })}>
            <option value="">Any year</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Rating</span>
          <select className="select" value={filters.minRating ?? ''} onChange={(event) => onChange({ minRating: optionalNumber(event.target.value) })}>
            <option value="">Any rating</option>
            {RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {rating}+ ★
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Sort by</span>
          <select className="select" value={filters.sort} onChange={(event) => onChange({ sort: event.target.value as SortOption })}>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={onReset} className={styles.reset}>
            <RotateCcw size={16} /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}
