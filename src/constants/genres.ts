import type { Genre, MediaType } from '@/types/media';

/**
 * TMDB genre ids rarely change, so we hard-code them instead of fetching on every load.
 * Source: GET /genre/movie/list and /genre/tv/list
 */
export const ANIMATION_GENRE_ID = 16;

export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

export const TV_GENRES: Genre[] = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
];

const ALL_GENRES = [...MOVIE_GENRES, ...TV_GENRES];
const GENRE_NAMES = new Map(ALL_GENRES.map((genre) => [genre.id, genre.name]));

export function getGenres(mediaType: MediaType | 'all'): Genre[] {
  if (mediaType === 'movie') return MOVIE_GENRES;
  if (mediaType === 'tv') return TV_GENRES;
  return [...GENRE_NAMES].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function getGenreName(id: number): string {
  return GENRE_NAMES.get(id) ?? 'Other';
}
