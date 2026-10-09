/**
 * Works out what changed between two versions of a user's data.
 * The library helpers in utils/library.ts never mutate, and keep unchanged items as the same
 * object, so a simple reference check (`!==`) tells us exactly what was added, changed or removed.
 */

import type { CustomList, LibraryEntry, UserData, WatchEvent } from '@/types/user';

export interface UserDataChanges {
  libraryUpserts: LibraryEntry[];
  libraryDeletes: LibraryEntry[];
  watchInserts: WatchEvent[];
  watchDeletes: string[];
  listUpserts: CustomList[];
  listDeletes: string[];
}

export function diffUserData(previous: UserData, next: UserData): UserDataChanges {
  const libraryUpserts = Object.entries(next.library)
    .filter(([key, entry]) => previous.library[key] !== entry)
    .map(([, entry]) => entry);
  const libraryDeletes = Object.entries(previous.library)
    .filter(([key]) => !(key in next.library))
    .map(([, entry]) => entry);

  const previousWatchIds = new Set(previous.watches.map((watch) => watch.id));
  const nextWatchIds = new Set(next.watches.map((watch) => watch.id));

  const previousLists = new Map(previous.lists.map((list) => [list.id, list]));
  const nextListIds = new Set(next.lists.map((list) => list.id));

  return {
    libraryUpserts,
    libraryDeletes,
    watchInserts: next.watches.filter((watch) => !previousWatchIds.has(watch.id)),
    watchDeletes: [...previousWatchIds].filter((id) => !nextWatchIds.has(id)),
    listUpserts: next.lists.filter((list) => previousLists.get(list.id) !== list),
    listDeletes: [...previousLists.keys()].filter((id) => !nextListIds.has(id)),
  };
}
