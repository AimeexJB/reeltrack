/**
 * The logged-in user's library: tracked titles, watch history and custom lists.
 * The rules live in `utils/library.ts`; this file wires them to React state and the backend
 * (browser storage or Supabase — see `services/index.ts`).
 *
 * Changes show up instantly (optimistic updates) and are saved in the background, one at a time,
 * so they always reach the backend in the order they happened.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { backendKind, libraryService } from '@/services';
import type { ImportedItem, ImportSource } from '@/types/import';
import type { Episode, MediaSummary } from '@/types/media';
import type { LibraryEntry, TrackStatus, UserData } from '@/types/user';
import * as library from '@/utils/library';
import { mediaKey } from '@/utils/media';
import { useAuth } from './AuthContext';

interface LibraryContextValue {
  data: UserData;
  /** False while the user's data is loading. */
  loaded: boolean;
  /** Set when a change couldn't be saved. */
  syncError: string | null;
  dismissSyncError: () => void;

  getEntry: (media: MediaSummary) => LibraryEntry | undefined;
  setStatus: (media: MediaSummary, status: TrackStatus) => void;
  removeFromLibrary: (media: MediaSummary) => void;

  getMovieWatchCount: (movieId: number) => number;
  logMovieWatch: (movie: MediaSummary, runtime: number) => void;
  undoMovieWatch: (movie: MediaSummary) => void;

  /** Episode number → times watched, for one season of a show. */
  getEpisodeCounts: (showId: number, seasonNumber: number) => Map<number, number>;
  markEpisodesWatched: (show: MediaSummary, episodes: Episode[], fallbackRuntime: number) => void;
  unmarkEpisodes: (showId: number, episodes: Episode[]) => void;
  logEpisodeRewatch: (show: MediaSummary, episodes: Episode[], fallbackRuntime: number) => void;
  undoEpisodeRewatch: (showId: number, episodes: Episode[]) => void;

  createList: (name: string) => void;
  deleteList: (listId: string) => void;
  toggleListItem: (listId: string, media: MediaSummary) => void;

  /** Add titles/viewings from IMDb, TV Time or Plex. Resolves (once saved) with how many viewings were new. */
  importItems: (items: ImportedItem[], source: ImportSource) => Promise<number>;
  /** Merge a backup file or another account's data. Returns once saved. */
  mergeData: (incoming: UserData) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

interface LibraryState {
  userId: string | null;
  data: UserData;
  loaded: boolean;
}

const EMPTY_COUNTS = new Map<number, number>();

const EMPTY_STATE: LibraryState = { userId: null, data: library.EMPTY_USER_DATA, loaded: false };

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<LibraryState>(EMPTY_STATE);
  const [syncError, setSyncError] = useState<string | null>(null);
  // The latest state, readable from callbacks without re-creating them.
  const stateRef = useRef(state);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingSaves = useRef(0);

  const commit = useCallback((next: LibraryState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const reload = useCallback(
    async (id: string) => {
      try {
        const data = await libraryService.load(id);
        if (stateRef.current.userId === id) commit({ userId: id, data, loaded: true });
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'Couldn’t load your data.');
      }
    },
    [commit],
  );

  // Load the user's data when they log in; clear it when they log out.
  useEffect(() => {
    commit(userId ? { userId, data: library.EMPTY_USER_DATA, loaded: false } : EMPTY_STATE);
    if (userId) reload(userId);
  }, [userId, commit, reload]);

  // With cloud sync, pick up changes made elsewhere (another device, Plex) when you come back to the tab.
  useEffect(() => {
    if (backendKind !== 'supabase' || !userId) return;
    const handleVisible = () => {
      if (document.visibilityState === 'visible' && pendingSaves.current === 0) reload(userId);
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, [userId, reload]);

  const update = useCallback(
    (change: (data: UserData) => UserData): Promise<void> => {
      const current = stateRef.current;
      if (!current.userId || !current.loaded) return Promise.resolve();
      const next = change(current.data);
      if (next === current.data) return Promise.resolve();

      const id = current.userId;
      commit({ ...current, data: next });
      pendingSaves.current++;
      const saving = saveQueue.current.then(() => libraryService.save(id, current.data, next));
      saveQueue.current = saving
        .catch((error: unknown) => {
          setSyncError(`Couldn’t save your last change (${error instanceof Error ? error.message : 'unknown error'}). Showing your saved data.`);
          return reload(id);
        })
        .finally(() => pendingSaves.current--);
      return saving;
    },
    [commit, reload],
  );

  /** For everyday actions: failures are already reported through `syncError`. */
  const fire = useCallback((change: (data: UserData) => UserData) => void update(change).catch(() => undefined), [update]);

  const { data, loaded } = state;

  // Index of watched episodes: "showId:season" → (episode number → times watched). Rebuilt only when watches change.
  const episodeIndex = useMemo(() => {
    const index = new Map<string, Map<number, number>>();
    for (const watch of data.watches) {
      if (watch.mediaType !== 'tv' || watch.seasonNumber === undefined || watch.episodeNumber === undefined) continue;
      const key = `${watch.tmdbId}:${watch.seasonNumber}`;
      if (!index.has(key)) index.set(key, new Map());
      const counts = index.get(key)!;
      counts.set(watch.episodeNumber, (counts.get(watch.episodeNumber) ?? 0) + 1);
    }
    return index;
  }, [data.watches]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      data,
      loaded,
      syncError,
      dismissSyncError: () => setSyncError(null),

      getEntry: (media) => data.library[mediaKey(media)],
      setStatus: (media, status) => fire((d) => library.setStatus(d, media, status)),
      removeFromLibrary: (media) => fire((d) => library.removeFromLibrary(d, media)),

      getMovieWatchCount: (movieId) => data.watches.filter((w) => w.mediaType === 'movie' && w.tmdbId === movieId).length,
      logMovieWatch: (movie, runtime) => fire((d) => library.logMovieWatch(d, movie, runtime)),
      undoMovieWatch: (movie) => fire((d) => library.undoLatestMovieWatch(d, movie)),

      getEpisodeCounts: (showId, seasonNumber) => episodeIndex.get(`${showId}:${seasonNumber}`) ?? EMPTY_COUNTS,
      markEpisodesWatched: (show, episodes, fallbackRuntime) =>
        fire((d) => library.markEpisodesWatched(d, show, episodes, fallbackRuntime)),
      unmarkEpisodes: (showId, episodes) => fire((d) => library.unmarkEpisodes(d, showId, episodes)),
      logEpisodeRewatch: (show, episodes, fallbackRuntime) => fire((d) => library.logEpisodeRewatch(d, show, episodes, fallbackRuntime)),
      undoEpisodeRewatch: (showId, episodes) => fire((d) => library.undoEpisodeRewatch(d, showId, episodes)),

      createList: (name) => fire((d) => library.createList(d, name)),
      deleteList: (listId) => fire((d) => library.deleteList(d, listId)),
      toggleListItem: (listId, media) => fire((d) => library.toggleListItem(d, listId, media)),

      importItems: async (items, source) => {
        let added = 0;
        await update((d) => {
          const next = library.mergeImport(d, items, source);
          added = next.watches.length - d.watches.length;
          return next;
        });
        return added;
      },
      mergeData: (incoming) => update((d) => library.mergeUserData(d, incoming)),
    }),
    [data, loaded, syncError, episodeIndex, update, fire],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return context;
}
