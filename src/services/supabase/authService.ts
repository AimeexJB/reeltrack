/** Real accounts via Supabase Auth (email + password). Profile details live in the `profiles` table. */

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types/user';
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
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(normalized)) {
      throw new Error('Username must be 3–30 characters: letters, numbers, dots or underscores.');
    }
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
    const { data, error } = await (await getSupabase())
      .from('profiles')
      .update({ display_name: changes.displayName, avatar_url: changes.avatarUrl })
      .eq('id', userId)
      .select()
      .single<ProfileRow>();
    if (error) throw new Error(error.message);
    return toUser(data);
  },
};
