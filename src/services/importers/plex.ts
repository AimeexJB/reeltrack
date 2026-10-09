/**
 * One-off import of your Plex watch history, straight from your Plex Media Server (no Plex Pass needed).
 * Runs in your browser, so the server address must be reachable from this computer.
 * Your Plex token is only used for these requests and is never saved.
 */

import type { ImportResult, ProgressCallback } from '@/types/import';
import { mapWithConcurrency } from '@/utils/async';
import { parseImportDate } from '@/utils/date';
import { ImportCollector } from './collector';
import { TmdbResolver, type ResolvedTitle } from './resolver';

export interface PlexConnection {
  serverUrl: string;
  token: string;
}

export interface PlexAccount {
  id: number;
  name: string;
}

interface PlexHistoryItem {
  type: string;
  Guid?: { id: string }[];
  title: string;
  grandparentTitle?: string;
  parentIndex?: number;
  index?: number;
  viewedAt: number;
  ratingKey?: string;
  grandparentRatingKey?: string;
  grandparentKey?: string;
  year?: number;
  duration?: number;
}

interface PlexMetadata {
  title: string;
  year?: number;
  Guid?: { id: string }[];
}

async function plexGet<T>({ serverUrl, token }: PlexConnection, path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, serverUrl.replace(/\/+$/, '') + '/');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json', 'X-Plex-Token': token } });
  } catch {
    throw new Error('Couldn’t reach your Plex server. Check the address, and that this computer is on the same network.');
  }
  if (response.status === 401) throw new Error('Plex rejected the token. Double-check it and try again.');
  if (!response.ok) throw new Error(`Plex request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export async function getPlexAccounts(connection: PlexConnection): Promise<PlexAccount[]> {
  const data = await plexGet<{ MediaContainer: { Account?: { id: number; name: string }[] } }>(connection, 'accounts');
  return (data.MediaContainer.Account ?? []).filter((account) => account.id > 0 && account.name).map(({ id, name }) => ({ id, name }));
}

/** Plex stores external ids like "tmdb://603" or "imdb://tt0133093" on each item. */
function tmdbIdFrom(metadata: Pick<PlexMetadata, 'Guid'> | null): number | null {
  const guid = metadata?.Guid?.find((item) => item.id.startsWith('tmdb://'));
  return guid ? Number(guid.id.slice('tmdb://'.length)) : null;
}

/** Server owners: every viewing from the server's history log (including rewatches, with exact dates). */
export async function importPlexHistory(connection: PlexConnection, accountId: number, onProgress?: ProgressCallback): Promise<ImportResult> {
  const data = await plexGet<{ MediaContainer: { Metadata?: PlexHistoryItem[] } }>(connection, 'status/sessions/history/all', {
    sort: 'viewedAt:desc',
    accountID: String(accountId),
    'X-Plex-Container-Start': '0',
    'X-Plex-Container-Size': '10000',
  });
  const history = (data.MediaContainer.Metadata ?? []).filter((item) => item.type === 'movie' || item.type === 'episode');
  return resolvePlexItems(connection, history, onProgress);
}

interface PlexLibraryItem extends Omit<PlexHistoryItem, 'viewedAt'> {
  viewCount?: number;
  lastViewedAt?: number;
}

const PAGE_SIZE = 2000;

/** Every item of one type in a library section, a page at a time. */
async function getSectionItems(connection: PlexConnection, sectionKey: string, type: 1 | 4): Promise<PlexLibraryItem[]> {
  const items: PlexLibraryItem[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const page = await plexGet<{ MediaContainer: { Metadata?: PlexLibraryItem[]; totalSize?: number; size?: number } }>(
      connection,
      `library/sections/${sectionKey}/all`,
      {
        type: String(type), // 1 = movies, 4 = episodes
        unwatched: '0',
        includeGuids: '1',
        'X-Plex-Container-Start': String(start),
        'X-Plex-Container-Size': String(PAGE_SIZE),
      },
    );
    const batch = page.MediaContainer.Metadata ?? [];
    items.push(...batch);
    const total = page.MediaContainer.totalSize ?? batch.length;
    if (batch.length < PAGE_SIZE || items.length >= total) return items;
  }
}

/**
 * Shared (non-owner) users can't read the server's history log, but Plex does keep each user's own
 * watched marks. This reads every movie/episode marked as watched for *your* account in the libraries
 * shared with you. Limitation: Plex only stores the most recent watch date per title, not each rewatch.
 */
export async function importPlexWatchedItems(connection: PlexConnection, onProgress?: ProgressCallback): Promise<ImportResult> {
  const sections = await plexGet<{ MediaContainer: { Directory?: { key: string; type: string }[] } }>(connection, 'library/sections');
  const libraries = (sections.MediaContainer.Directory ?? []).filter((section) => section.type === 'movie' || section.type === 'show');

  const lists = await Promise.all(
    libraries.map((section) => getSectionItems(connection, section.key, section.type === 'movie' ? 1 : 4)),
  );
  const watched = lists
    .flat()
    .filter((item) => (item.viewCount ?? 0) > 0)
    .map((item): PlexHistoryItem => ({ ...item, viewedAt: item.lastViewedAt ?? Math.floor(Date.now() / 1000) }));

  return resolvePlexItems(connection, watched, onProgress);
}

/** Matches Plex movies/episodes to TMDB (via Plex's own tmdb:// ids where possible) and collects them. */
async function resolvePlexItems(connection: PlexConnection, items: PlexHistoryItem[], onProgress?: ProgressCallback): Promise<ImportResult> {
  const resolver = new TmdbResolver();
  const collector = new ImportCollector('plex');
  const metadataCache = new Map<string, Promise<PlexMetadata | null>>();

  const getMetadata = (ratingKey: string | undefined) => {
    if (!ratingKey) return Promise.resolve(null);
    if (!metadataCache.has(ratingKey)) {
      metadataCache.set(
        ratingKey,
        plexGet<{ MediaContainer: { Metadata?: PlexMetadata[] } }>(connection, `library/metadata/${ratingKey}`, { includeGuids: '1' })
          .then((result) => result.MediaContainer.Metadata?.[0] ?? null)
          .catch(() => null), // Item may have been removed from the library — fall back to a title search.
      );
    }
    return metadataCache.get(ratingKey)!;
  };

  await mapWithConcurrency(
    items,
    6,
    async (item) => {
      const watchedAt = parseImportDate(item.viewedAt) ?? new Date().toISOString();

      if (item.type === 'movie') {
        // Library listings already include Guids; history entries need a metadata lookup.
        const tmdbId = tmdbIdFrom(item.Guid ? item : await getMetadata(item.ratingKey));
        const movie: ResolvedTitle | null = tmdbId ? await resolver.title('movie', tmdbId) : await resolver.search('movie', item.title, item.year);
        if (!movie) return collector.miss(item.title);
        return collector.add(movie.media, 'completed', { watchedAt, runtime: movie.runtime });
      }

      const showKey = item.grandparentRatingKey ?? item.grandparentKey?.split('/').pop();
      const tmdbId = tmdbIdFrom(await getMetadata(showKey));
      const showName = item.grandparentTitle ?? item.title;
      const show = tmdbId ? await resolver.title('tv', tmdbId) : await resolver.search('tv', showName);
      if (!show || item.parentIndex === undefined || item.index === undefined) return collector.miss(`${showName} — ${item.title}`);
      collector.add(show.media, 'watching', {
        watchedAt,
        runtime: item.duration ? Math.round(item.duration / 60000) : show.runtime,
        seasonNumber: item.parentIndex,
        episodeNumber: item.index,
      });
    },
    onProgress,
  );

  return collector.result();
}
