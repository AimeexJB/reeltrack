/** Real accounts via Supabase Auth (email + password). Profile details live in the `profiles` table. */

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types/user';
import { normalizeUsername, validateDisplayName, validateUsername } from '@/utils/validation';
import type { AuthService } from '../types';
import { getSupabase } from './client';
import { toUser, type ProfileRow } from './rows';

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
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        // Supabase recommends not awaiting other Supabase calls inside this callback, so defer it.
        setTimeout(async () => callback(session?.user ? await loadProfile(session.user) : null), 0);
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
};
