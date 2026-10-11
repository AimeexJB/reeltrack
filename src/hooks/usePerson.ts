import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getPerson } from '@/api/tmdb';
import { useLibrary } from '@/context/LibraryContext';
import type { PersonCredit, PersonDetails } from '@/types/media';
import { mediaKey } from '@/utils/media';

const ONE_DAY = 24 * 60 * 60 * 1000;

const personQuery = (id: number) => ({ queryKey: ['person', id], queryFn: () => getPerson(id), staleTime: ONE_DAY });

export function usePerson(id: number, enabled = true) {
  return useQuery({ ...personQuery(id), enabled });
}

/** Start loading as soon as someone shows interest, so the card is usually ready when it opens. */
export function prefetchPerson(queryClient: QueryClient, id: number) {
  return queryClient.prefetchQuery(personQuery(id));
}

export type SeenStatus = 'watchlist' | 'watching' | 'completed' | 'watched';

export interface SeenCredit {
  credit: PersonCredit;
  status: SeenStatus;
}

const SEEN_ORDER: SeenStatus[] = ['completed', 'watched', 'watching', 'watchlist'];

/** Credits that are in the user's library or watch history — "where do I know them from?". */
export function useSeenIn(person: PersonDetails | undefined, excludeKey?: string): SeenCredit[] {
  const { data } = useLibrary();

  return useMemo(() => {
    if (!person) return [];
    const watched = new Set(data.watches.map((watch) => `${watch.mediaType}:${watch.tmdbId}`));
    return person.credits
      .filter((credit) => mediaKey(credit) !== excludeKey)
      .flatMap((credit): SeenCredit[] => {
        const key = mediaKey(credit);
        const status = data.library[key]?.status ?? (watched.has(key) ? 'watched' : null);
        return status ? [{ credit, status }] : [];
      })
      .sort((a, b) => SEEN_ORDER.indexOf(a.status) - SEEN_ORDER.indexOf(b.status));
  }, [person, data.library, data.watches, excludeKey]);
}
