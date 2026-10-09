/**
 * "Sign in with Plex" using Plex's official PIN flow (the same one apps like Overseerr use):
 *  1. Ask plex.tv for a PIN.
 *  2. Open app.plex.tv/auth in a popup, where you log in and approve Reeltrack.
 *  3. Poll the PIN until Plex attaches a token to it.
 * Then list your servers and find an address this browser can reach — no token hunting needed.
 * The token is kept in memory only, for this import.
 */

import { createId } from '@/utils/id';
import { storage } from '../storage';

const PRODUCT = 'Reeltrack';
const POLL_INTERVAL = 2000;
const LOGIN_TIMEOUT = 5 * 60 * 1000;
const CONNECTION_TIMEOUT = 5000;

/** Plex wants a stable id for this "device" (this browser). */
function clientId(): string {
  let id = storage.get<string | null>('plex-client-id', null);
  if (!id) {
    id = createId();
    storage.set('plex-client-id', id);
  }
  return id;
}

function plexHeaders(token?: string): HeadersInit {
  return {
    Accept: 'application/json',
    'X-Plex-Product': PRODUCT,
    'X-Plex-Client-Identifier': clientId(),
    ...(token && { 'X-Plex-Token': token }),
  };
}

async function plexTv<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`https://plex.tv/api/v2${path}`, { ...init, headers: plexHeaders(token) });
  if (!response.ok) throw new Error(`Plex sign-in failed (${response.status}).`);
  return response.json() as Promise<T>;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Opens the Plex login popup and resolves with your Plex token once you approve.
 * Call it straight from a click so popup blockers allow the window. `onAuthUrl` receives the
 * sign-in link too, so the page can offer it as a normal link if the popup was blocked.
 */
export async function signInWithPlex(signal: AbortSignal, onAuthUrl: (url: string, popupBlocked: boolean) => void): Promise<string> {
  // Open the window immediately (inside the click) so popup blockers allow it, then point it at Plex.
  const popup = window.open('', 'plex-auth', 'width=600,height=720');
  try {
    const pin = await plexTv<{ id: number; code: string }>('/pins?strong=true', { method: 'POST' });
    const authUrl = `https://app.plex.tv/auth#?${new URLSearchParams({
      clientID: clientId(),
      code: pin.code,
      'context[device][product]': PRODUCT,
    })}`;
    if (popup) popup.location.href = authUrl;
    onAuthUrl(authUrl, !popup);

    const started = Date.now();
    while (Date.now() - started < LOGIN_TIMEOUT) {
      if (signal.aborted) throw new Error('Sign-in cancelled.');
      await wait(POLL_INTERVAL);
      const status = await plexTv<{ authToken: string | null }>(`/pins/${pin.id}`);
      if (status.authToken) return status.authToken;
      if (popup?.closed) throw new Error('The Plex window was closed before signing in.');
    }
    throw new Error('Plex sign-in timed out. Please try again.');
  } finally {
    popup?.close();
  }
}

export async function getPlexUsername(token: string): Promise<string> {
  const user = await plexTv<{ username?: string; title?: string }>('/user', {}, token);
  return user.username || user.title || '';
}

export interface PlexServer {
  id: string;
  name: string;
  owned: boolean;
  /** Token for this particular server (differs from your account token for shared servers). */
  accessToken: string;
  connections: { uri: string; local: boolean; relay: boolean }[];
}

export async function getPlexServers(token: string): Promise<PlexServer[]> {
  const resources = await plexTv<
    {
      clientIdentifier: string;
      name: string;
      provides: string;
      owned: boolean;
      accessToken: string;
      connections?: { uri: string; local: boolean; relay: boolean }[];
    }[]
  >('/resources?includeHttps=1&includeRelay=1', {}, token);

  return resources
    .filter((resource) => resource.provides.split(',').includes('server'))
    .map((resource) => ({
      id: resource.clientIdentifier,
      name: resource.name,
      owned: resource.owned,
      accessToken: resource.accessToken,
      connections: resource.connections ?? [],
    }))
    .sort((a, b) => Number(b.owned) - Number(a.owned));
}

/**
 * Plex lists several addresses per server (home network, internet, relay).
 * Try them all at once and use the first that answers — preferring local, then direct, then relay.
 */
export async function findServerAddress(server: PlexServer): Promise<string> {
  const ordered = [...server.connections].sort(
    (a, b) => Number(a.relay) - Number(b.relay) || Number(b.local) - Number(a.local),
  );
  if (ordered.length === 0) throw new Error(`Plex didn't list any addresses for “${server.name}”. Is the server online?`);

  const attempts = ordered.map(async ({ uri }, index) => {
    // Give better addresses a small head start so a fast relay doesn't win over a local connection.
    await wait(index * 300);
    const response = await fetch(`${uri}/identity`, {
      headers: { Accept: 'application/json', 'X-Plex-Token': server.accessToken },
      signal: AbortSignal.timeout(CONNECTION_TIMEOUT),
    });
    if (!response.ok) throw new Error(String(response.status));
    return uri;
  });

  try {
    return await Promise.any(attempts);
  } catch {
    throw new Error(`Couldn’t reach “${server.name}”. Make sure the server is switched on and Plex is running on it.`);
  }
}
