/**
 * Cloudflare Worker that serves Reeltrack at www.aimeeredmond.com/reeltracker.
 *
 * The route in wrangler.jsonc sends only `/reeltracker*` here — the rest of the domain
 * (the portfolio) is untouched. This Worker:
 *   1. redirects the bare domain to www, and `/reeltracker` → `/reeltracker/`
 *   2. proxies `/reeltracker/api/tmdb/*` to TMDB, adding the secret TMDB_TOKEN server-side
 *      (so the token never appears in the browser)
 *   3. serves the built app from ./dist; unknown app routes fall back to index.html
 */

interface Env {
  ASSETS: Fetcher;
  /** TMDB v4 "API Read Access Token" (or a v3 API key). Set as a secret in the Cloudflare dashboard. */
  TMDB_TOKEN: string;
}

const PREFIX = '/reeltracker';
/** The site's main address (the portfolio also redirects the bare domain to www). */
const CANONICAL_HOST = 'www.aimeeredmond.com';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_CACHE_SECONDS = 600;

async function proxyTmdb(request: Request, path: string, search: string, env: Env): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (!env.TMDB_TOKEN) return new Response('TMDB_TOKEN is not configured', { status: 500 });

  const target = new URL(TMDB_BASE + path + search);
  // v4 read tokens are long JWTs sent as a Bearer header; v3 keys are 32-char query params.
  const useBearer = env.TMDB_TOKEN.length > 40;
  if (!useBearer) target.searchParams.set('api_key', env.TMDB_TOKEN);

  const upstream = await fetch(target, {
    headers: { accept: 'application/json', ...(useBearer && { Authorization: `Bearer ${env.TMDB_TOKEN}` }) },
    // Let Cloudflare's edge cache successful responses.
    cf: { cacheTtl: TMDB_CACHE_SECONDS, cacheEverything: true },
  });

  const response = new Response(upstream.body, upstream);
  if (upstream.ok) response.headers.set('Cache-Control', `public, max-age=${TMDB_CACHE_SECONDS}`);
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // aimeeredmond.com/reeltracker… → www.aimeeredmond.com/reeltracker… (one address, so logins/storage are shared).
    if (url.hostname === 'aimeeredmond.com') {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === PREFIX) return Response.redirect(`${url.origin}${PREFIX}/`, 301);

    // The built files live at the root of ./dist, so drop the "/reeltracker" prefix.
    const path = url.pathname.startsWith(`${PREFIX}/`) ? url.pathname.slice(PREFIX.length) : url.pathname;

    if (path.startsWith('/api/tmdb/')) return proxyTmdb(request, path.slice('/api/tmdb'.length), url.search, env);

    return env.ASSETS.fetch(new Request(new URL(path + url.search, url.origin), request));
  },
} satisfies ExportedHandler<Env>;
