import type { MediaType } from '@/types/media';

/** A named TMDB list endpoint, used for home-page rows and the Movies / TV Shows category tabs. */
export interface MediaListDef {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
  /** Omit for mixed lists (e.g. trending/all) — TMDB includes the type per item. */
  mediaType?: MediaType;
  /** If set, the row's "See all" link opens this category on the browse page. */
  browseCategory?: string;
  /** Overrides the "See all" link (e.g. to the Anime page). */
  seeAllPath?: string;
}

export const HERO_LIST: MediaListDef = { id: 'hero', title: 'Trending today', path: '/trending/all/day' };

export const HOME_LISTS: MediaListDef[] = [
  { id: 'trending-movies', title: 'Most Watched Movies', subtitle: 'Trending this week', path: '/trending/movie/week', mediaType: 'movie', browseCategory: 'trending' },
  { id: 'trending-tv', title: 'Most Watched TV Shows', subtitle: 'Trending this week', path: '/trending/tv/week', mediaType: 'tv', browseCategory: 'trending' },
  { id: 'now-playing', title: 'Recently Released', subtitle: 'In cinemas now', path: '/movie/now_playing', mediaType: 'movie', browseCategory: 'now_playing' },
  { id: 'on-the-air', title: 'New Episodes', subtitle: 'Shows airing this week', path: '/tv/on_the_air', mediaType: 'tv', browseCategory: 'on_the_air' },
  {
    id: 'popular-anime',
    title: 'Popular Anime',
    subtitle: 'Japanese animation — series',
    path: '/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=200',
    mediaType: 'tv',
    seeAllPath: '/anime',
  },
  { id: 'top-movies', title: 'Top Rated Movies', subtitle: 'Highest rated of all time', path: '/movie/top_rated', mediaType: 'movie', browseCategory: 'top_rated' },
  { id: 'top-tv', title: 'Top Rated TV Shows', subtitle: 'Highest rated of all time', path: '/tv/top_rated', mediaType: 'tv', browseCategory: 'top_rated' },
  { id: 'upcoming', title: 'Coming Soon', subtitle: 'Upcoming movie releases', path: '/movie/upcoming', mediaType: 'movie', browseCategory: 'upcoming' },
];

export const BROWSE_CATEGORIES: Record<MediaType, MediaListDef[]> = {
  movie: [
    { id: 'popular', title: 'Popular', path: '/movie/popular', mediaType: 'movie' },
    { id: 'trending', title: 'Trending', path: '/trending/movie/week', mediaType: 'movie' },
    { id: 'now_playing', title: 'In Cinemas', path: '/movie/now_playing', mediaType: 'movie' },
    { id: 'upcoming', title: 'Upcoming', path: '/movie/upcoming', mediaType: 'movie' },
    { id: 'top_rated', title: 'Top Rated', path: '/movie/top_rated', mediaType: 'movie' },
  ],
  tv: [
    { id: 'popular', title: 'Popular', path: '/tv/popular', mediaType: 'tv' },
    { id: 'trending', title: 'Trending', path: '/trending/tv/week', mediaType: 'tv' },
    { id: 'airing_today', title: 'Airing Today', path: '/tv/airing_today', mediaType: 'tv' },
    { id: 'on_the_air', title: 'On The Air', path: '/tv/on_the_air', mediaType: 'tv' },
    { id: 'top_rated', title: 'Top Rated', path: '/tv/top_rated', mediaType: 'tv' },
  ],
};
