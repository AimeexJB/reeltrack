import { SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { discover, type DiscoverFilters } from '@/api/tmdb';
import { MediaGrid } from '@/components/media/MediaGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadMoreTrigger } from '@/components/ui/LoadMoreTrigger';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { ANIMATION_GENRE_ID, getGenres } from '@/constants/genres';
import { useInfiniteMedia } from '@/hooks/useMediaQueries';
import type { MediaType } from '@/types/media';
import styles from './BrowseView.module.css';

type Format = 'series' | 'movies';
type Category = 'popular' | 'airing' | 'top_rated' | 'new';

const FORMATS: { value: Format; label: string; mediaType: MediaType }[] = [
  { value: 'series', label: 'Series', mediaType: 'tv' },
  { value: 'movies', label: 'Movies', mediaType: 'movie' },
];

const CATEGORIES: { value: Category; label: string; seriesOnly?: boolean }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'airing', label: 'Airing Now', seriesOnly: true },
  { value: 'top_rated', label: 'Top Rated' },
  { value: 'new', label: 'New Releases' },
];

/** Genres that make sense for anime (TMDB ids). Animation itself is always applied. */
const ANIME_GENRE_IDS: Record<MediaType, number[]> = {
  tv: [10759, 35, 18, 10765, 9648, 80, 10768],
  movie: [28, 12, 35, 18, 14, 10749, 878, 27, 9648, 53],
};

/** Every anime query: Japanese-language Animation. */
const ANIME_FILTERS: DiscoverFilters = { requiredGenreIds: [ANIMATION_GENRE_ID], originalLanguage: 'ja' };

// Vote floors keep well-known anime on top (raw popularity is easily gamed by obscure titles).
const CATEGORY_FILTERS: Record<Category, DiscoverFilters> = {
  popular: { sort: 'popularity', minVoteCount: 200 },
  airing: { sort: 'popularity', airingNow: true, minVoteCount: 20 },
  top_rated: { sort: 'rating', minVoteCount: 300 },
  new: { sort: 'newest', minVoteCount: 10 },
};

/**
 * The Anime page: anime series and movies with category tabs and genre chips.
 * State lives in the URL (?format=&category=&genre=) so it survives refresh and back/forward.
 */
export function AnimeView() {
  const [params, setParams] = useSearchParams();
  const format = FORMATS.find((item) => item.value === params.get('format')) ?? FORMATS[0];
  const categories = CATEGORIES.filter((item) => !item.seriesOnly || format.value === 'series');
  const category = categories.find((item) => item.value === params.get('category')) ?? categories[0];
  const genres = getGenres(format.mediaType).filter((genre) => ANIME_GENRE_IDS[format.mediaType].includes(genre.id));
  const genreId = genres.find((genre) => genre.id === Number(params.get('genre')))?.id;

  const update = (changes: Record<string, string | undefined>) => {
    const next = { format: format.value, category: category.value, genre: genreId ? String(genreId) : undefined, ...changes };
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)) as Record<string, string>);
  };

  const { query, items } = useInfiniteMedia(['anime', format.value, category.value, genreId], (page) =>
    discover(format.mediaType, { ...ANIME_FILTERS, ...CATEGORY_FILTERS[category.value], genreId }, page),
  );

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Anime</h1>
        <p className={styles.subtitle}>
          {category.label} anime {format.value === 'series' ? 'series' : 'movies'}
          {genreId && ` · ${genres.find((genre) => genre.id === genreId)?.name}`}
        </p>
      </header>

      <div className={styles.controls}>
        <Tabs label="Format" value={format.value} onChange={(value) => update({ format: value, category: 'popular', genre: undefined })} options={FORMATS} />
        <Tabs
          label="Category"
          value={category.value}
          onChange={(value) => update({ category: value })}
          options={categories.map(({ value, label }) => ({ value, label }))}
        />
        <div className={styles.genres} role="group" aria-label="Genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              type="button"
              className={styles.genre}
              aria-pressed={genre.id === genreId}
              onClick={() => update({ genre: genre.id === genreId ? undefined : String(genre.id) })}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={SearchX} title="Nothing here yet" description="Try a different category or genre." />
      ) : (
        <>
          <MediaGrid items={items} />
          <LoadMoreTrigger hasMore={query.hasNextPage} isLoading={query.isFetchingNextPage} onLoadMore={query.fetchNextPage} />
        </>
      )}
    </div>
  );
}
