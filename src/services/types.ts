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

/** What an emailed link (invite / password reset) asked for when the app was opened. */
export interface AuthLinkInfo {
  /** The user must choose a password (they came from an invite or "reset password" email). */
  needsPassword: boolean;
  /** The link was invalid or expired (e.g. already used). */
  error: string | null;
}

export interface AuthService {
  /** Calls back with the current user now, and again whenever it changes. Returns an unsubscribe function. */
  subscribe(callback: (user: User | null, info?: { passwordRecovery?: boolean }) => void): () => void;
  /** `identifier` is a username (local) or an email address (Supabase). */
  login(identifier: string, password: string): Promise<void>;
  /** `needsConfirmation` is true when Supabase wants the user to click an email link first. */
  register(input: RegisterInput): Promise<{ needsConfirmation: boolean }>;
  logout(): Promise<void>;
  /** Throws a user-friendly Error (e.g. "That username is already taken."). */
  updateProfile(userId: string, changes: ProfileChanges): Promise<User>;

  // ---- Email-based password management (Supabase only; undefined for browser-only accounts) ----
  /** Reads (once) whether the app was opened from an invite / reset link. */
  readAuthLink?(): AuthLinkInfo;
  /** Emails a link to the set-password page. */
  requestPasswordReset?(email: string): Promise<void>;
  /** Sets a new password for the signed-in user. */
  setPassword?(password: string): Promise<void>;
}

export interface LibraryRepository {
  load(userId: string): Promise<UserData>;
  /** Persist the change from `previous` to `next`. Backends may save everything or just the difference. */
  save(userId: string, previous: UserData, next: UserData): Promise<void>;
}
