import type { MediaType } from './media';

export type MediaTypeFilter = 'all' | MediaType;
export type SortOption = 'popularity' | 'rating' | 'newest';

export interface SearchFilters {
  query: string;
  mediaType: MediaTypeFilter;
  genreId?: number;
  year?: number;
  minRating?: number;
  sort: SortOption;
}
