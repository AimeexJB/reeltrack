import type { MediaSummary, MediaType } from './media';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export type TrackStatus = 'watchlist' | 'watching' | 'completed';

/** A title the user is tracking (in their watchlist, currently watching, or finished). */
export interface LibraryEntry {
  media: MediaSummary;
  status: TrackStatus;
  addedAt: string;
  updatedAt: string;
}

/** One "I watched this" record — a movie viewing or a single TV episode. Powers all stats. */
export interface WatchEvent {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  /** Minutes. */
  runtime: number;
  watchedAt: string;
  genreIds: number[];
  seasonNumber?: number;
  episodeNumber?: number;
  /** Where this came from: 'app' (default), 'imdb', 'tvtime', 'plex' or 'backup'. */
  source?: string;
}

export interface CustomList {
  id: string;
  name: string;
  createdAt: string;
  items: MediaSummary[];
}

/** Everything we persist for a single user. */
export interface UserData {
  /** Keyed by `mediaKey()` e.g. "movie:550". */
  library: Record<string, LibraryEntry>;
  watches: WatchEvent[];
  lists: CustomList[];
}
