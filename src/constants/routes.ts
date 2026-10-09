import type { MediaType } from '@/types/media';

/** Every URL in the app lives here so links never drift out of sync with the router. */
export const paths = {
  home: '/',
  search: '/search',
  movies: '/movies',
  tvShows: '/tv-shows',
  profile: '/profile',
  settings: '/settings',
  login: '/login',
  media: (mediaType: MediaType, id: number) => `/${mediaType}/${id}`,
  browse: (mediaType: MediaType) => (mediaType === 'movie' ? '/movies' : '/tv-shows'),
} as const;
