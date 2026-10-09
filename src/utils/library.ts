/**
 * Pure functions that take the user's data and return an updated copy.
 * Keeping them out of React makes the tracking rules easy to read and test.
 */

import type { Episode, MediaSummary } from '@/types/media';
import type { ImportedItem, ImportSource } from '@/types/import';
import type { CustomList, LibraryEntry, TrackStatus, UserData, WatchEvent } from '@/types/user';
import { createId } from './id';
import { mediaKey, toSummary } from './media';

export const EMPTY_USER_DATA: UserData = { library: {}, watches: [], lists: [] };

export function setStatus(data: UserData, media: MediaSummary, status: TrackStatus): UserData {
  const key = mediaKey(media);
  const now = new Date().toISOString();
  const existing = data.library[key];
  const entry: LibraryEntry = { media: toSummary(media), status, addedAt: existing?.addedAt ?? now, updatedAt: now };
  return { ...data, library: { ...data.library, [key]: entry } };
}

export function removeFromLibrary(data: UserData, media: MediaSummary): UserData {
  const library = { ...data.library };
  delete library[mediaKey(media)];
  return { ...data, library };
}

function createWatch(media: MediaSummary, runtime: number, episode?: Episode): WatchEvent {
  return {
    id: createId(),
    tmdbId: media.id,
    mediaType: media.mediaType,
    title: media.title,
    runtime,
    watchedAt: new Date().toISOString(),
    genreIds: media.genreIds,
    seasonNumber: episode?.seasonNumber,
    episodeNumber: episode?.episodeNumber,
  };
}

/** Logging a movie marks it completed. Logging again counts as a rewatch. */
export function logMovieWatch(data: UserData, media: MediaSummary, runtime: number): UserData {
  const withWatch = { ...data, watches: [...data.watches, createWatch(media, runtime)] };
  return setStatus(withWatch, media, 'completed');
}

/** Removes the most recent viewing. If none are left, the movie leaves the library. */
export function undoLatestMovieWatch(data: UserData, media: MediaSummary): UserData {
  const index = data.watches.findLastIndex((watch) => watch.mediaType === 'movie' && watch.tmdbId === media.id);
  if (index === -1) return data;
  const watches = data.watches.filter((_, i) => i !== index);
  const updated = { ...data, watches };
  const stillWatched = watches.some((watch) => watch.mediaType === 'movie' && watch.tmdbId === media.id);
  return stillWatched ? updated : removeFromLibrary(updated, media);
}

function isSameEpisode(watch: WatchEvent, showId: number, episode: Pick<Episode, 'seasonNumber' | 'episodeNumber'>) {
  return (
    watch.mediaType === 'tv' &&
    watch.tmdbId === showId &&
    watch.seasonNumber === episode.seasonNumber &&
    watch.episodeNumber === episode.episodeNumber
  );
}

/** Watching an episode moves a show to "watching" (unless it's already completed). */
function ensureWatching(data: UserData, show: MediaSummary): UserData {
  const status = data.library[mediaKey(show)]?.status;
  return status === 'watching' || status === 'completed' ? data : setStatus(data, show, 'watching');
}

export function markEpisodesWatched(data: UserData, show: MediaSummary, episodes: Episode[], fallbackRuntime: number): UserData {
  const newWatches = episodes
    .filter((episode) => !data.watches.some((watch) => isSameEpisode(watch, show.id, episode)))
    .map((episode) => createWatch(show, episode.runtime || fallbackRuntime, episode));
  if (newWatches.length === 0) return data;
  return ensureWatching({ ...data, watches: [...data.watches, ...newWatches] }, show);
}

/** Logs another viewing of each episode, even if already watched (rewatches count towards stats). */
export function logEpisodeRewatch(data: UserData, show: MediaSummary, episodes: Episode[], fallbackRuntime: number): UserData {
  if (episodes.length === 0) return data;
  const newWatches = episodes.map((episode) => createWatch(show, episode.runtime || fallbackRuntime, episode));
  return ensureWatching({ ...data, watches: [...data.watches, ...newWatches] }, show);
}

/** Undoes the most recent rewatch: removes the latest viewing of each episode that was watched more than once. */
export function undoEpisodeRewatch(data: UserData, showId: number, episodes: Episode[]): UserData {
  const toRemove = new Set<string>();
  for (const episode of episodes) {
    const viewings = data.watches.filter((watch) => isSameEpisode(watch, showId, episode));
    if (viewings.length > 1) toRemove.add(viewings.reduce((latest, watch) => (watch.watchedAt > latest.watchedAt ? watch : latest)).id);
  }
  return toRemove.size ? { ...data, watches: data.watches.filter((watch) => !toRemove.has(watch.id)) } : data;
}

/** Un-watching an episode of a completed show moves it back to "watching". */
export function unmarkEpisodes(data: UserData, showId: number, episodes: Episode[]): UserData {
  const watches = data.watches.filter((watch) => !episodes.some((episode) => isSameEpisode(watch, showId, episode)));
  if (watches.length === data.watches.length) return data;
  const updated = { ...data, watches };
  const entry = data.library[`tv:${showId}`];
  return entry?.status === 'completed' ? setStatus(updated, entry.media, 'watching') : updated;
}

export function createList(data: UserData, name: string): UserData {
  const list: CustomList = { id: createId(), name, createdAt: new Date().toISOString(), items: [] };
  return { ...data, lists: [...data.lists, list] };
}

export function deleteList(data: UserData, listId: string): UserData {
  return { ...data, lists: data.lists.filter((list) => list.id !== listId) };
}

export function toggleListItem(data: UserData, listId: string, media: MediaSummary): UserData {
  const key = mediaKey(media);
  const lists = data.lists.map((list) => {
    if (list.id !== listId) return list;
    const exists = list.items.some((item) => mediaKey(item) === key);
    return { ...list, items: exists ? list.items.filter((item) => mediaKey(item) !== key) : [toSummary(media), ...list.items] };
  });
  return { ...data, lists };
}

const STATUS_RANK: Record<TrackStatus, number> = { watchlist: 0, watching: 1, completed: 2 };

/** Picks the "further along" status, so imports never move something backwards (e.g. completed → watchlist). */
function furthestStatus(a: TrackStatus | undefined, b: TrackStatus): TrackStatus {
  return a && STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

const episodeKey = (tmdbId: number, season?: number, episode?: number) => `${tmdbId}:${season}:${episode}`;
const movieDayKey = (tmdbId: number, watchedAt: string) => `${tmdbId}:${watchedAt.slice(0, 10)}`;

/**
 * Adds imported titles and viewings. Safe to run twice on the same file:
 * episodes already marked watched, and movies already logged on the same day, are skipped.
 */
export function mergeImport(data: UserData, items: ImportedItem[], source: ImportSource): UserData {
  const library = { ...data.library };
  const watches = [...data.watches];
  const seenEpisodes = new Set(watches.filter((w) => w.mediaType === 'tv').map((w) => episodeKey(w.tmdbId, w.seasonNumber, w.episodeNumber)));
  const seenMovieDays = new Set(watches.filter((w) => w.mediaType === 'movie').map((w) => movieDayKey(w.tmdbId, w.watchedAt)));

  for (const item of items) {
    const { media } = item;
    for (const watch of item.watches) {
      const isTv = media.mediaType === 'tv';
      const key = isTv ? episodeKey(media.id, watch.seasonNumber, watch.episodeNumber) : movieDayKey(media.id, watch.watchedAt);
      if (isTv && (watch.seasonNumber === undefined || watch.episodeNumber === undefined)) continue;
      if ((isTv ? seenEpisodes : seenMovieDays).has(key)) continue;
      (isTv ? seenEpisodes : seenMovieDays).add(key);
      watches.push({
        id: createId(),
        tmdbId: media.id,
        mediaType: media.mediaType,
        title: media.title,
        runtime: watch.runtime,
        watchedAt: watch.watchedAt,
        genreIds: media.genreIds,
        seasonNumber: watch.seasonNumber,
        episodeNumber: watch.episodeNumber,
        source: watch.source ?? source,
      });
    }

    const key = mediaKey(media);
    const existing = library[key];
    const status = furthestStatus(existing?.status, item.status);
    const dates = item.watches.map((watch) => watch.watchedAt).sort();
    const now = new Date().toISOString();
    if (!existing || existing.status !== status) {
      library[key] = {
        media: existing?.media ?? media,
        status,
        addedAt: existing?.addedAt ?? dates[0] ?? now,
        updatedAt: dates.at(-1) ?? now,
      };
    }
  }

  watches.sort((a, b) => a.watchedAt.localeCompare(b.watchedAt));
  return { ...data, library, watches };
}

/**
 * Merges a backup (or another account's data) into the current data.
 * Library: the most recently updated version wins. Watches and lists: added if not already present.
 */
export function mergeUserData(data: UserData, incoming: UserData): UserData {
  const library = { ...data.library };
  for (const [key, entry] of Object.entries(incoming.library)) {
    if (!library[key] || library[key].updatedAt < entry.updatedAt) library[key] = entry;
  }

  const watchIds = new Set(data.watches.map((watch) => watch.id));
  const watches = [...data.watches, ...incoming.watches.filter((watch) => !watchIds.has(watch.id))];
  watches.sort((a, b) => a.watchedAt.localeCompare(b.watchedAt));

  const listIds = new Set(data.lists.map((list) => list.id));
  const lists = [...data.lists, ...incoming.lists.filter((list) => !listIds.has(list.id))];

  return { library, watches, lists };
}
