/** Per-user Plex webhook settings (Supabase only — Plex needs a public URL to send events to). */

import { getSupabase, supabaseUrl } from './client';

export interface PlexWebhookSettings {
  webhookUrl: string;
  plexUsername: string;
}

export async function getPlexWebhookSettings(userId: string): Promise<PlexWebhookSettings> {
  const { data, error } = await (await getSupabase())
    .from('profiles')
    .select('plex_webhook_token, plex_username')
    .eq('id', userId)
    .single<{ plex_webhook_token: string; plex_username: string | null }>();
  if (error) throw new Error(error.message);
  return {
    webhookUrl: `${supabaseUrl}/functions/v1/plex-webhook?token=${data.plex_webhook_token}`,
    plexUsername: data.plex_username ?? '',
  };
}

export async function savePlexUsername(userId: string, plexUsername: string): Promise<void> {
  const { error } = await (await getSupabase())
    .from('profiles')
    .update({ plex_username: plexUsername.trim() || null })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

/** Issues a new secret URL — the old one stops working (use if the URL was shared by accident). */
export async function regeneratePlexWebhookToken(): Promise<void> {
  const { error } = await (await getSupabase()).rpc('regenerate_plex_webhook_token');
  if (error) throw new Error(error.message);
}
