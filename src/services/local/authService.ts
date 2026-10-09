/**
 * Browser-only accounts, stored in localStorage. Used when Supabase isn't configured.
 * Passwords are salted + hashed, but this is NOT real security — it's for a personal app on your own machine.
 */

import type { User } from '@/types/user';
import { createId } from '@/utils/id';
import { normalizeUsername, validateDisplayName, validateUsername } from '@/utils/validation';
import { storage } from '../storage';
import type { AuthService } from '../types';

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

export const USERS_KEY = 'users';
const SESSION_KEY = 'session';

const listeners = new Set<(user: User | null) => void>();

async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getStoredUsers(): StoredUser[] {
  return storage.get<StoredUser[]>(USERS_KEY, []);
}

function toPublicUser({ passwordHash: _hash, salt: _salt, ...user }: StoredUser): User {
  return user;
}

function currentUser(): User | null {
  const userId = storage.get<string | null>(SESSION_KEY, null);
  const user = getStoredUsers().find((candidate) => candidate.id === userId);
  return user ? toPublicUser(user) : null;
}

function notify() {
  const user = currentUser();
  listeners.forEach((listener) => listener(user));
}

export const localAuthService: AuthService = {
  subscribe(callback) {
    listeners.add(callback);
    callback(currentUser());
    return () => listeners.delete(callback);
  },

  async login(username, password) {
    const user = getStoredUsers().find((candidate) => candidate.username === username.trim().toLowerCase());
    if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      throw new Error('Incorrect username or password.');
    }
    storage.set(SESSION_KEY, user.id);
    notify();
  },

  async register({ username, password, displayName }) {
    const normalized = normalizeUsername(username);
    const usernameError = validateUsername(normalized);
    if (usernameError) throw new Error(usernameError);
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const users = getStoredUsers();
    if (users.some((user) => user.username === normalized)) throw new Error('That username is already taken.');

    const salt = createId();
    const user: StoredUser = {
      id: createId(),
      username: normalized,
      displayName: displayName.trim() || username.trim(),
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    storage.set(USERS_KEY, [...users, user]);
    storage.set(SESSION_KEY, user.id);
    notify();
    return { needsConfirmation: false };
  },

  async logout() {
    storage.remove(SESSION_KEY);
    notify();
  },

  async updateProfile(userId, changes) {
    const users = getStoredUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) throw new Error('User not found.');

    const update = { ...changes };
    if (update.displayName !== undefined) {
      const error = validateDisplayName(update.displayName);
      if (error) throw new Error(error);
      update.displayName = update.displayName.trim();
    }
    if (update.username !== undefined) {
      update.username = normalizeUsername(update.username);
      const error = validateUsername(update.username);
      if (error) throw new Error(error);
      if (users.some((user) => user.id !== userId && user.username === update.username)) throw new Error('That username is already taken.');
    }

    users[index] = { ...users[index], ...update };
    storage.set(USERS_KEY, users);
    return toPublicUser(users[index]);
  },
};
