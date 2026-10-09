import type { MediaSummary } from '@/types/media';
import type { SearchFilters, SortOption } from '@/types/search';
import { getYear } from './date';

/** Unique key for a title across movies and TV (ids can collide between the two). */
export function mediaKey(media: Pick<MediaSummary, 'mediaType' | 'id'>): string {
  return `${media.mediaType}:${media.id}`;
}

/** TMDB pages occasionally repeat items — drop duplicates while keeping order. */
export function dedupeMedia(items: MediaSummary[]): MediaSummary[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = mediaKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortMedia(items: MediaSummary[], sort: SortOption): MediaSummary[] {
  const sorted = [...items];
  if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
  else if (sort === 'newest') sorted.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  else sorted.sort((a, b) => b.popularity - a.popularity);
  return sorted;
}

/** Client-side filtering for text-search results (TMDB's search endpoint can't filter by genre/rating). */
export function matchesFilters(media: MediaSummary, filters: SearchFilters): boolean {
  if (filters.mediaType !== 'all' && media.mediaType !== filters.mediaType) return false;
  if (filters.genreId && !media.genreIds.includes(filters.genreId)) return false;
  if (filters.year && getYear(media.releaseDate) !== filters.year) return false;
  if (filters.minRating && media.rating < filters.minRating) return false;
  return true;
}

/** Strip detail-only fields (cast, seasons…) so only the lightweight summary is stored. */
export function toSummary(media: MediaSummary): MediaSummary {
  const { id, mediaType, title, posterPath, backdropPath, overview, releaseDate, rating, voteCount, popularity, genreIds } = media;
  return { id, mediaType, title, posterPath, backdropPath, overview, releaseDate, rating, voteCount, popularity, genreIds };
}
