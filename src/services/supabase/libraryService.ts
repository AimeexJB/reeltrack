/**
 * Stores tracking data in Supabase tables. Instead of re-uploading everything on each change,
 * `save` works out what changed (see utils/diff.ts) and only sends that.
 */

import type { UserData } from '@/types/user';
import { diffUserData } from '@/utils/diff';
import { mediaKey } from '@/utils/media';
import type { LibraryRepository } from '../types';
import { getSupabase } from './client';
import {
  fromLibraryRow,
  fromListRow,
  fromWatchRow,
  toLibraryRow,
  toListRow,
  toWatchRow,
  type LibraryRow,
  type ListRow,
  type WatchRow,
} from './rows';

const PAGE_SIZE = 1000;
const INSERT_BATCH = 500;

/** Supabase returns at most 1000 rows per request, so page through big tables. */
async function selectAll<T>(table: string, userId: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await (await getSupabase())
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function check({ error }: { error: { message: string } | null }) {
  if (error) throw new Error(error.message);
}

export const supabaseLibraryService: LibraryRepository = {
  async load(userId) {
    const [libraryRows, watchRows, listRows] = await Promise.all([
      selectAll<LibraryRow>('library_entries', userId),
      selectAll<WatchRow>('watch_events', userId),
      selectAll<ListRow>('custom_lists', userId),
    ]);

    const library: UserData['library'] = {};
    for (const row of libraryRows) {
      const entry = fromLibraryRow(row);
      library[mediaKey(entry.media)] = entry;
    }
    return {
      library,
      watches: watchRows.map(fromWatchRow).sort((a, b) => a.watchedAt.localeCompare(b.watchedAt)),
      lists: listRows.map(fromListRow).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  },

  async save(userId, previous, next) {
    const client = await getSupabase();
    const changes = diffUserData(previous, next);

    if (changes.libraryUpserts.length) {
      check(
        await client
          .from('library_entries')
          .upsert(changes.libraryUpserts.map((entry) => toLibraryRow(userId, entry)), { onConflict: 'user_id,media_type,tmdb_id' }),
      );
    }
    for (const entry of changes.libraryDeletes) {
      check(
        await client.from('library_entries').delete().match({ user_id: userId, media_type: entry.media.mediaType, tmdb_id: entry.media.id }),
      );
    }

    for (const batch of chunk(changes.watchInserts, INSERT_BATCH)) {
      check(await client.from('watch_events').insert(batch.map((watch) => toWatchRow(userId, watch))));
    }
    for (const batch of chunk(changes.watchDeletes, INSERT_BATCH)) {
      check(await client.from('watch_events').delete().eq('user_id', userId).in('id', batch));
    }

    if (changes.listUpserts.length) {
      check(await client.from('custom_lists').upsert(changes.listUpserts.map((list) => toListRow(userId, list))));
    }
    if (changes.listDeletes.length) {
      check(await client.from('custom_lists').delete().eq('user_id', userId).in('id', changes.listDeletes));
    }
  },
};
