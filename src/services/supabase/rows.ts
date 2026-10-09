/** Database row shapes (snake_case, see supabase/schema.sql) and converters to/from app types. */

import type { MediaSummary, MediaType } from '@/types/media';
import type { CustomList, LibraryEntry, TrackStatus, User, WatchEvent } from '@/types/user';

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface LibraryRow {
  user_id: string;
  media_type: MediaType;
  tmdb_id: number;
  media: MediaSummary;
  status: TrackStatus;
  added_at: string;
  updated_at: string;
}

export interface WatchRow {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  runtime: number;
  watched_at: string;
  genre_ids: number[];
  season_number: number | null;
  episode_number: number | null;
  source: string;
}

export interface ListRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  items: MediaSummary[];
}

export const toUser = (row: ProfileRow): User => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
});

export const toLibraryRow = (userId: string, entry: LibraryEntry): LibraryRow => ({
  user_id: userId,
  media_type: entry.media.mediaType,
  tmdb_id: entry.media.id,
  media: entry.media,
  status: entry.status,
  added_at: entry.addedAt,
  updated_at: entry.updatedAt,
});

export const fromLibraryRow = (row: LibraryRow): LibraryEntry => ({
  media: row.media,
  status: row.status,
  addedAt: row.added_at,
  updatedAt: row.updated_at,
});

export const toWatchRow = (userId: string, watch: WatchEvent): WatchRow => ({
  id: watch.id,
  user_id: userId,
  tmdb_id: watch.tmdbId,
  media_type: watch.mediaType,
  title: watch.title,
  runtime: watch.runtime,
  watched_at: watch.watchedAt,
  genre_ids: watch.genreIds,
  season_number: watch.seasonNumber ?? null,
  episode_number: watch.episodeNumber ?? null,
  source: watch.source ?? 'app',
});

export const fromWatchRow = (row: WatchRow): WatchEvent => ({
  id: row.id,
  tmdbId: row.tmdb_id,
  mediaType: row.media_type,
  title: row.title,
  runtime: row.runtime,
  watchedAt: row.watched_at,
  genreIds: row.genre_ids ?? [],
  seasonNumber: row.season_number ?? undefined,
  episodeNumber: row.episode_number ?? undefined,
  source: row.source,
});

export const toListRow = (userId: string, list: CustomList): ListRow => ({
  id: list.id,
  user_id: userId,
  name: list.name,
  created_at: list.createdAt,
  items: list.items,
});

export const fromListRow = (row: ListRow): CustomList => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  items: row.items ?? [],
});
