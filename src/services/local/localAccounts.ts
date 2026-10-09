/**
 * Finds tracking data saved by browser-only accounts, so it can be moved
 * into a Supabase account after switching to cloud sync.
 */

import type { UserData } from '@/types/user';
import { storage } from '../storage';
import { getStoredUsers } from './authService';
import { readLocalData } from './libraryService';

export interface LocalAccountData {
  userId: string;
  username: string;
  data: UserData;
}

const MIGRATED_KEY = 'migrated-local-accounts';

export function findLocalAccounts(): LocalAccountData[] {
  const migrated = new Set(storage.get<string[]>(MIGRATED_KEY, []));
  return getStoredUsers()
    .filter((user) => !migrated.has(user.id))
    .map((user) => ({ userId: user.id, username: user.username, data: readLocalData(user.id) }))
    .filter(({ data }) => Object.keys(data.library).length + data.watches.length + data.lists.length > 0);
}

export function markLocalAccountMigrated(userId: string): void {
  storage.set(MIGRATED_KEY, [...storage.get<string[]>(MIGRATED_KEY, []), userId]);
}
