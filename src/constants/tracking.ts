import type { MediaType } from '@/types/media';
import type { TrackStatus } from '@/types/user';

export const STATUS_LABELS: Record<TrackStatus, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  completed: 'Completed',
};

/** Statuses offered per type. Movies use "watching" for one you're part-way through. */
export const STATUSES_BY_TYPE: Record<MediaType, TrackStatus[]> = {
  movie: ['watchlist', 'watching', 'completed'],
  tv: ['watchlist', 'watching', 'completed'],
};

export const MEDIA_TYPE_LABELS: Record<MediaType, { singular: string; plural: string }> = {
  movie: { singular: 'Movie', plural: 'Movies' },
  tv: { singular: 'TV Show', plural: 'TV Shows' },
};
