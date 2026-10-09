/**
 * Thin fetch wrapper for The Movie Database (TMDB) API.
 * Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */

const TOKEN = import.meta.env.VITE_TMDB_TOKEN?.trim();
/** Online, requests go through our Worker (worker/index.ts), which adds the token server-side. */
const USE_PROXY = import.meta.env.VITE_TMDB_PROXY === 'true';
const BASE_URL = USE_PROXY ? `${import.meta.env.BASE_URL}api/tmdb` : 'https://api.themoviedb.org/3';

export const isTmdbConfigured = USE_PROXY || Boolean(TOKEN);

export class TmdbError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'TmdbError';
    this.status = status;
  }
}

type QueryParams = Record<string, string | number | undefined>;

export async function tmdbFetch<T>(path: string, params: QueryParams = {}, signal?: AbortSignal): Promise<T> {
  if (!isTmdbConfigured) {
    throw new TmdbError('TMDB token missing. Add VITE_TMDB_TOKEN to your .env file.', 401);
  }

  const url = new URL(BASE_URL + path, window.location.origin);
  // v4 "Read Access Tokens" are long JWTs sent as a Bearer header; v3 keys are 32-char query params.
  const useBearer = !USE_PROXY && TOKEN!.length > 40;
  if (!USE_PROXY && !useBearer) url.searchParams.set('api_key', TOKEN!);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    signal,
    headers: useBearer ? { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' } : undefined,
  });

  if (!response.ok) {
    const message =
      response.status === 401
        ? USE_PROXY
          ? 'TMDB rejected the token. Check the TMDB_TOKEN secret in Cloudflare.'
          : 'TMDB rejected the token. Check VITE_TMDB_TOKEN in your .env file.'
        : `TMDB request failed (${response.status})`;
    throw new TmdbError(message, response.status);
  }

  return response.json() as Promise<T>;
}
