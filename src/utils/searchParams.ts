import type { MediaTypeFilter, SearchFilters, SortOption } from '@/types/search';

const MEDIA_TYPES: MediaTypeFilter[] = ['all', 'movie', 'tv'];
const SORTS: SortOption[] = ['popularity', 'rating', 'newest'];

function toNumber(value: string | null): number | undefined {
  const number = Number(value);
  return value && Number.isFinite(number) && number > 0 ? number : undefined;
}

/** Search filters live in the URL so results are shareable and survive refresh / back button. */
export function parseSearchFilters(params: URLSearchParams): SearchFilters {
  const type = params.get('type') as MediaTypeFilter;
  const sort = params.get('sort') as SortOption;
  return {
    query: params.get('q') ?? '',
    mediaType: MEDIA_TYPES.includes(type) ? type : 'all',
    genreId: toNumber(params.get('genre')),
    year: toNumber(params.get('year')),
    minRating: toNumber(params.get('rating')),
    sort: SORTS.includes(sort) ? sort : 'popularity',
  };
}

export function serializeSearchFilters(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.mediaType !== 'all') params.set('type', filters.mediaType);
  if (filters.genreId) params.set('genre', String(filters.genreId));
  if (filters.year) params.set('year', String(filters.year));
  if (filters.minRating) params.set('rating', String(filters.minRating));
  if (filters.sort !== 'popularity') params.set('sort', filters.sort);
  return params;
}
