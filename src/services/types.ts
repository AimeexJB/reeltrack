/**
 * The contracts every backend must implement. The rest of the app only talks to these,
 * so switching between "this browser only" and Supabase doesn't touch any components.
 */

import type { User, UserData } from '@/types/user';

export type BackendKind = 'local' | 'supabase';

export type ProfileChanges = Partial<Pick<User, 'displayName' | 'avatarUrl' | 'username'>>;

export interface RegisterInput {
  username: string;
  password: string;
  displayName: string;
  /** Required by Supabase; ignored by the local backend. */
  email?: string;
}

export interface AuthService {
  /** Calls back with the current user now, and again whenever it changes. Returns an unsubscribe function. */
  subscribe(callback: (user: User | null) => void): () => void;
  /** `identifier` is a username (local) or an email address (Supabase). */
  login(identifier: string, password: string): Promise<void>;
  /** `needsConfirmation` is true when Supabase wants the user to click an email link first. */
  register(input: RegisterInput): Promise<{ needsConfirmation: boolean }>;
  logout(): Promise<void>;
  /** Throws a user-friendly Error (e.g. "That username is already taken."). */
  updateProfile(userId: string, changes: ProfileChanges): Promise<User>;
}

export interface LibraryRepository {
  load(userId: string): Promise<UserData>;
  /** Persist the change from `previous` to `next`. Backends may save everything or just the difference. */
  save(userId: string, previous: UserData, next: UserData): Promise<void>;
}
