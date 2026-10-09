import { QueryClient } from '@tanstack/react-query';
import { TmdbError } from '@/api/tmdb';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // TMDB data changes slowly — cache aggressively so navigation feels instant.
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      // Don't retry errors that won't fix themselves (bad token, not found).
      retry: (failureCount, error) =>
        !(error instanceof TmdbError && [401, 404].includes(error.status)) && failureCount < 2,
    },
  },
});
