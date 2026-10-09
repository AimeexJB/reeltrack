/**
 * Supabase Edge Function: plex-webhook
 *
 * Plex (with Plex Pass) POSTs an event here whenever something happens on your server.
 * When you finish a movie or episode ("media.scrobble"), we look it up on TMDB and log it
 * to the user whose secret token is in the URL: .../functions/v1/plex-webhook?token=<uuid>
 *
 * Needs the secret TMDB_TOKEN (same value as VITE_TMDB_TOKEN in the app's .env).
 * Must be deployed with JWT verification OFF, because Plex can't send a Supabase login token.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const TMDB_TOKEN = Deno.env.get('TMDB_TOKEN') ?? '';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const DEFAULT_RUNTIME = { movie: 110, tv: 45 };

type MediaType = 'movie' | 'tv';

interface PlexMetadata {
  type: string;
  title: string;
  year?: number;
  grandparentTitle?: string;
  parentIndex?: number;
  index?: number;
  duration?: number; // milliseconds
  Guid?: { id: string }[];
}

interface Resolved {
  mediaType: MediaType;
  tmdbId: number;
  seasonNumber?: number;
  episodeNumber?: number;
}

// deno-lint-ignore no-explicit-any
type Json = any;

const reply = (message: string, status = 200) => new Response(message, { status });

async function tmdb(path: string, params: Record<string, string | undefined> = {}): Promise<Json | null> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  const bearer = TMDB_TOKEN.length > 40; // v4 read token vs v3 api key
  if (!bearer) url.searchParams.set('api_key', TMDB_TOKEN);
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: bearer ? { Authorization: `Bearer ${TMDB_TOKEN}` } : {} });
  return response.ok ? response.json() : null;
}

/** Plex tags items with ids like "tmdb://603", "imdb://tt0133093", "tvdb://12345". */
function externalId(metadata: PlexMetadata, scheme: string): string | undefined {
  return metadata.Guid?.find((guid) => guid.id.startsWith(`${scheme}://`))?.id.slice(scheme.length + 3);
}

async function resolve(metadata: PlexMetadata): Promise<Resolved | null> {
  if (metadata.type === 'movie') {
    const tmdbId = externalId(metadata, 'tmdb');
    if (tmdbId) return { mediaType: 'movie', tmdbId: Number(tmdbId) };
    const imdbId = externalId(metadata, 'imdb');
    if (imdbId) {
      const found = await tmdb(`/find/${imdbId}`, { external_source: 'imdb_id' });
      if (found?.movie_results?.[0]) return { mediaType: 'movie', tmdbId: found.movie_results[0].id };
    }
    const search = await tmdb('/search/movie', { query: metadata.title, year: metadata.year?.toString() });
    return search?.results?.[0] ? { mediaType: 'movie', tmdbId: search.results[0].id } : null;
  }

  if (metadata.type === 'episode') {
    // An episode's IMDb/TVDB id tells TMDB exactly which show, season and episode it is.
    for (const [scheme, source] of [['imdb', 'imdb_id'], ['tvdb', 'tvdb_id']]) {
      const id = externalId(metadata, scheme);
      if (!id) continue;
      const episode = (await tmdb(`/find/${id}`, { external_source: source }))?.tv_episode_results?.[0];
      if (episode) {
        return { mediaType: 'tv', tmdbId: episode.show_id, seasonNumber: episode.season_number, episodeNumber: episode.episode_number };
      }
    }
    // Fall back to searching for the show by name.
    if (metadata.grandparentTitle && metadata.parentIndex !== undefined && metadata.index !== undefined) {
      const search = await tmdb('/search/tv', { query: metadata.grandparentTitle });
      if (search?.results?.[0]) {
        return { mediaType: 'tv', tmdbId: search.results[0].id, seasonNumber: metadata.parentIndex, episodeNumber: metadata.index };
      }
    }
  }
  return null;
}

/** Same shape as the app's MediaSummary (stored in library_entries.media). */
function toMediaSummary(details: Json, mediaType: MediaType) {
  return {
    id: details.id,
    mediaType,
    title: details.title ?? details.name ?? 'Untitled',
    posterPath: details.poster_path ?? null,
    backdropPath: details.backdrop_path ?? null,
    overview: details.overview ?? '',
    releaseDate: details.release_date ?? details.first_air_date ?? '',
    rating: details.vote_average ?? 0,
    voteCount: details.vote_count ?? 0,
    popularity: details.popularity ?? 0,
    genreIds: (details.genres ?? []).map((genre: { id: number }) => genre.id),
    originalLanguage: details.original_language,
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply('Method not allowed', 405);

  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(token)) return reply('Missing or invalid token', 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, plex_username')
    .eq('plex_webhook_token', token)
    .maybeSingle();
  if (!profile) return reply('Unknown token', 401);

  // Plex sends multipart/form-data with the event JSON in a "payload" field.
  let payload: Json;
  try {
    payload = JSON.parse(String((await request.formData()).get('payload') ?? '{}'));
  } catch {
    return reply('Could not read payload', 400);
  }

  // Always answer 200 for events we ignore, so Plex doesn't treat the webhook as broken.
  if (payload.event !== 'media.scrobble') return reply(`Ignored event ${payload.event}`);
  if (profile.plex_username && payload.Account?.title?.toLowerCase() !== profile.plex_username.toLowerCase()) {
    return reply('Ignored: different Plex user');
  }

  const metadata: PlexMetadata | undefined = payload.Metadata;
  const resolved = metadata ? await resolve(metadata) : null;
  if (!metadata || !resolved) return reply('Ignored: could not match title');

  const { mediaType, tmdbId, seasonNumber, episodeNumber } = resolved;
  const details = await tmdb(`/${mediaType}/${tmdbId}`);
  if (!details) return reply('Ignored: TMDB lookup failed');

  const media = toMediaSummary(details, mediaType);
  const runtime = metadata.duration
    ? Math.round(metadata.duration / 60000)
    : (mediaType === 'movie' ? details.runtime : details.episode_run_time?.[0]) || DEFAULT_RUNTIME[mediaType];
  const userId = profile.id;
  const now = new Date().toISOString();

  // Don't double-log: same episode already watched, or same movie in the last 3 hours.
  let duplicate = supabase.from('watch_events').select('id').eq('user_id', userId).eq('media_type', mediaType).eq('tmdb_id', tmdbId);
  duplicate =
    mediaType === 'tv'
      ? duplicate.eq('season_number', seasonNumber!).eq('episode_number', episodeNumber!)
      : duplicate.gte('watched_at', new Date(Date.now() - 3 * 3600_000).toISOString());
  const { data: existingWatch } = await duplicate.limit(1);
  if (existingWatch?.length) return reply('Already logged');

  const { error: insertError } = await supabase.from('watch_events').insert({
    user_id: userId,
    tmdb_id: tmdbId,
    media_type: mediaType,
    title: media.title,
    runtime,
    watched_at: now,
    genre_ids: media.genreIds,
    season_number: seasonNumber ?? null,
    episode_number: episodeNumber ?? null,
    source: 'plex',
  });
  if (insertError) return reply(`Database error: ${insertError.message}`, 500);

  // Movies become "completed"; shows become "watching" unless already watching/completed.
  const { data: entry } = await supabase
    .from('library_entries')
    .select('status')
    .match({ user_id: userId, media_type: mediaType, tmdb_id: tmdbId })
    .maybeSingle();
  const status = mediaType === 'movie' ? 'completed' : entry && entry.status !== 'watchlist' ? entry.status : 'watching';
  await supabase
    .from('library_entries')
    .upsert({ user_id: userId, media_type: mediaType, tmdb_id: tmdbId, media, status, updated_at: now }, { onConflict: 'user_id,media_type,tmdb_id' });

  const label = mediaType === 'tv' ? `${media.title} S${seasonNumber}E${episodeNumber}` : media.title;
  return reply(`Logged ${label}`);
});
