import { SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { discover, getMediaList } from '@/api/tmdb';
import { MediaGrid } from '@/components/media/MediaGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadMoreTrigger } from '@/components/ui/LoadMoreTrigger';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { getGenres } from '@/constants/genres';
import { BROWSE_CATEGORIES } from '@/constants/mediaLists';
import { MEDIA_TYPE_LABELS } from '@/constants/tracking';
import { useInfiniteMedia } from '@/hooks/useMediaQueries';
import type { MediaType } from '@/types/media';
import { isAnime } from '@/utils/media';
import styles from './BrowseView.module.css';

/**
 * Shared page body for /movies and /tv-shows: category tabs (Popular, Top Rated…),
 * genre chips, and an infinitely scrolling grid. State lives in the URL (?category= / ?genre=).
 */
export function BrowseView({ mediaType }: { mediaType: MediaType }) {
  const [params, setParams] = useSearchParams();
  const categories = BROWSE_CATEGORIES[mediaType];
  const genres = getGenres(mediaType);

  const genreId = Number(params.get('genre')) || undefined;
  const category = categories.find((item) => item.id === params.get('category')) ?? categories[0];
  const genre = genres.find((item) => item.id === genreId);

  const { query, items: allItems } = useInfiniteMedia(
    genreId ? ['browse-genre', mediaType, genreId] : ['browse', category.path],
    (page) => (genreId ? discover(mediaType, { genreId }, page) : getMediaList(category.path, mediaType, page)),
  );

  // Anime has its own page, so leave it out here.
  const items = allItems.filter((media) => !isAnime(media));

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>{MEDIA_TYPE_LABELS[mediaType].plural}</h1>
        <p className={styles.subtitle}>{genre ? `Popular ${genre.name.toLowerCase()} titles` : category.title}</p>
      </header>

      <div className={styles.controls}>
        <Tabs
          label="Category"
          value={genreId ? null : category.id}
          onChange={(id) => setParams({ category: id })}
          options={categories.map((item) => ({ value: item.id, label: item.title }))}
        />
        <div className={styles.genres} role="group" aria-label="Genres">
          {genres.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.genre}
              aria-pressed={item.id === genreId}
              onClick={() => setParams(item.id === genreId ? {} : { genre: String(item.id) })}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={SearchX} title="Nothing here yet" />
      ) : (
        <>
          <MediaGrid items={items} />
          <LoadMoreTrigger hasMore={query.hasNextPage} isLoading={query.isFetchingNextPage} onLoadMore={query.fetchNextPage} />
        </>
      )}
    </div>
  );
}
