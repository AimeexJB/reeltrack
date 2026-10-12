/**
 * Cloudflare Worker that serves Reeltrack at www.aimeeredmond.com/reeltracker.
 *
 * The routes in wrangler.jsonc send only `/reeltracker*` here — the rest of the domain
 * (the portfolio) is untouched. This Worker:
 *   1. redirects http → https (same host first), then the bare domain to www, and `/reeltracker` → `/reeltracker/`
 *   2. proxies `/reeltracker/api/tmdb/*` to TMDB, adding the secret TMDB_TOKEN server-side
 *      (so the token never appears in the browser) — only for the requests the app makes,
 *      and rate-limited per visitor so nobody can burn through the TMDB quota
 *   3. serves the built app from ./dist; unknown app routes fall back to index.html
 *   4. adds security headers to every response
 */

interface Env {
  ASSETS: Fetcher;
  /** TMDB v4 "API Read Access Token" (or a v3 API key). Set as a secret in the Cloudflare dashboard. */
  TMDB_TOKEN: string;
  /** Cloudflare rate limiter (see wrangler.jsonc). Optional so local dev works without it. */
  TMDB_RATE_LIMITER?: RateLimit;
}

const PREFIX = '/reeltracker';
/** The site's main address (the portfolio also redirects the bare domain to www). */
const CANONICAL_HOST = 'www.aimeeredmond.com';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_CACHE_SECONDS = 600;
const MAX_QUERY_LENGTH = 512;

/** The TMDB endpoints Reeltrack uses (see src/api/tmdb/endpoints.ts) — everything else is refused. */
const ALLOWED_TMDB_PATHS = [
  /^\/trending\/(all|movie|tv)\/(day|week)$/,
  /^\/(movie|tv)\/(popular|top_rated|now_playing|upcoming|airing_today|on_the_air)$/,
  /^\/(movie|tv)\/\d+(\/recommendations)?$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(multi|movie|tv)$/,
  /^\/find\/[\w.-]+$/,
  /^\/person\/\d+$/,
];

/**
 * Content Security Policy: the browser may only run our own scripts and talk to the services the app
 * needs (TMDB images, Supabase, Plex). Injected scripts, other sites framing the app, plugins, etc. are blocked.
 * style 'unsafe-inline' is needed for React `style={…}` attributes (progress bars, charts).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://image.tmdb.org",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://plex.tv https://*.plex.direct:*",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  // Only ever load over HTTPS (this host only — no includeSubDomains, so other subdomains are unaffected).
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  // Keeps other windows from reaching into the app, but still lets it control the "Sign in with Plex" pop-up it opens.
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

function withSecurityHeaders(response: Response): Response {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) secured.headers.set(name, value);
  return secured;
}

const jsonError = (status: number, message: string) =>
  new Response(JSON.stringify({ status_message: message }), { status, headers: { 'Content-Type': 'application/json' } });

async function proxyTmdb(request: Request, path: string, search: string, env: Env): Promise<Response> {
  if (request.method !== 'GET') return jsonError(405, 'Method not allowed');
  if (!ALLOWED_TMDB_PATHS.some((pattern) => pattern.test(path)) || search.length > MAX_QUERY_LENGTH) {
    return jsonError(404, 'Not found');
  }
  if (!env.TMDB_TOKEN) return jsonError(500, 'TMDB_TOKEN is not configured');

  // Per-visitor limit, generous for normal browsing (see wrangler.jsonc).
  if (env.TMDB_RATE_LIMITER) {
    const visitor = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.TMDB_RATE_LIMITER.limit({ key: visitor });
    if (!success) return jsonError(429, 'Too many requests — please slow down.');
  }

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

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const isLiveDomain = url.hostname === CANONICAL_HOST || url.hostname === 'aimeeredmond.com';

  // 1. Plain http → https on the *same* host first (then step 2 moves it to www), so every hop is secure.
  //    Skipped for local development, which runs on http://localhost.
  if (isLiveDomain && url.protocol === 'http:') {
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  // 2. aimeeredmond.com/reeltracker… → www.aimeeredmond.com/reeltracker… (one address, so logins/storage are shared).
  if (url.hostname === 'aimeeredmond.com') {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  if (url.pathname === PREFIX) return Response.redirect(`${url.origin}${PREFIX}/`, 301);

  // The built files live at the root of ./dist, so drop the "/reeltracker" prefix.
  const path = url.pathname.startsWith(`${PREFIX}/`) ? url.pathname.slice(PREFIX.length) : url.pathname;

  if (path.startsWith('/api/tmdb/')) return proxyTmdb(request, path.slice('/api/tmdb'.length), url.search, env);

  return env.ASSETS.fetch(new Request(new URL(path + url.search, url.origin), request));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return withSecurityHeaders(await route(request, env));
  },
} satisfies ExportedHandler<Env>;
