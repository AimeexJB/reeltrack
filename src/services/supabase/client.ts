import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_KEY?.trim();

export const supabaseUrl = url ?? '';
export const isSupabaseConfigured = Boolean(url && key);

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * The Supabase client, loaded on first use. The library is only downloaded when Supabase
 * is configured, so browser-only mode stays small and fast.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) {
    return Promise.reject(new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_KEY to .env.'));
  }
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url!, key!));
  return clientPromise;
}
