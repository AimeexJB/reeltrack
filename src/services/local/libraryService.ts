/** Stores each user's data as one JSON blob in localStorage. */

import type { UserData } from '@/types/user';
import { EMPTY_USER_DATA } from '@/utils/library';
import { storage } from '../storage';
import type { LibraryRepository } from '../types';

export const localDataKey = (userId: string) => `data:${userId}`;

export function readLocalData(userId: string): UserData {
  return { ...EMPTY_USER_DATA, ...storage.get<Partial<UserData>>(localDataKey(userId), {}) };
}

export const localLibraryService: LibraryRepository = {
  async load(userId) {
    return readLocalData(userId);
  },

  async save(userId, _previous, next) {
    storage.set(localDataKey(userId), next);
  },
};
