/** Real accounts via Supabase Auth (email + password). Profile details live in the `profiles` table. */

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types/user';
import { normalizeUsername, validateDisplayName, validateUsername } from '@/utils/validation';
import type { AuthLinkInfo, AuthService } from '../types';
import { getSupabase } from './client';
import { toUser, type ProfileRow } from './rows';

/**
 * Invite and password-reset emails send people back with tokens in the URL hash
 * (e.g. `#access_token=…&type=invite`). Supabase signs them in and then clears the hash,
 * so read it now, when the app first loads, to know they still need to choose a password.
 */
const initialAuthLink: AuthLinkInfo = (() => {
  if (typeof window === 'undefined') return { needsPassword: false, error: null };
  const params = new URLSearchParams(window.location.hash.slice(1));
  const type = params.get('type');
  const error = params.get('error_description');
  return {
    needsPassword: type === 'invite' || type === 'recovery',
    error: error ? `${error.replace(/\+/g, ' ')}. The link may have expired or already been used — request a new one below.` : null,
  };
})();

const passwordPageUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;

async function loadProfile(authUser: SupabaseUser): Promise<User> {
  const { data } = await (await getSupabase()).from('profiles').select('*').eq('id', authUser.id).maybeSingle<ProfileRow>();
  if (data) return toUser(data);

  // Fallback if the profile row is missing (e.g. the schema trigger wasn't installed).
  const meta = authUser.user_metadata as { username?: string; display_name?: string };
  return {
    id: authUser.id,
    username: meta.username ?? authUser.email?.split('@')[0] ?? 'user',
    displayName: meta.display_name ?? meta.username ?? 'You',
    avatarUrl: null,
    createdAt: authUser.created_at,
  };
}

export const supabaseAuthService: AuthService = {
  subscribe(callback) {
    let unsubscribe = () => {};
    let cancelled = false;
    getSupabase().then((client) => {
      if (cancelled) return;
      // Fires immediately with the saved session (if any), then on every login/logout/token refresh.
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Supabase recommends not awaiting other Supabase calls inside this callback, so defer it.
        setTimeout(
          async () => callback(session?.user ? await loadProfile(session.user) : null, { passwordRecovery: event === 'PASSWORD_RECOVERY' }),
          0,
        );
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  },

  async login(email, password) {
    const { error } = await (await getSupabase()).auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  },

  async register({ email, username, password, displayName }) {
    const normalized = normalizeUsername(username);
    const usernameError = validateUsername(normalized);
    if (usernameError) throw new Error(usernameError);
    const client = await getSupabase();
    const { data: available } = await client.rpc('username_available', { name: normalized });
    if (available === false) throw new Error('That username is already taken.');

    const { data, error } = await client.auth.signUp({
      email: (email ?? '').trim(),
      password,
      options: {
        data: { username: normalized, display_name: displayName.trim() || username.trim() },
        // Confirmation emails link back to wherever the app is hosted (e.g. /reeltracker/).
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  },

  async logout() {
    await (await getSupabase()).auth.signOut();
  },

  async updateProfile(userId, changes) {
    const row: Partial<Pick<ProfileRow, 'display_name' | 'avatar_url' | 'username'>> = {};
    if (changes.displayName !== undefined) {
      const error = validateDisplayName(changes.displayName);
      if (error) throw new Error(error);
      row.display_name = changes.displayName.trim();
    }
    if (changes.avatarUrl !== undefined) row.avatar_url = changes.avatarUrl;
    if (changes.username !== undefined) {
      row.username = normalizeUsername(changes.username);
      const error = validateUsername(row.username);
      if (error) throw new Error(error);
    }

    const { data, error } = await (await getSupabase())
      .from('profiles')
      .update(row)
      .eq('id', userId)
      .select()
      .single<ProfileRow>();
    // 23505 = unique violation: someone else already has this username.
    if (error) throw new Error(error.code === '23505' ? 'That username is already taken.' : error.message);
    return toUser(data);
  },

  readAuthLink() {
    return initialAuthLink;
  },

  async requestPasswordReset(email) {
    const { error } = await (await getSupabase()).auth.resetPasswordForEmail(email.trim(), { redirectTo: passwordPageUrl() });
    if (error) throw new Error(error.message);
  },

  async setPassword(password) {
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const { error } = await (await getSupabase()).auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },
};
