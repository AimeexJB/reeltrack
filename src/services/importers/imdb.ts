/**
 * IMDb CSV exports:
 *  - Ratings  (imdb.com → Your Ratings → ⋯ → Export): every rated title, with "Date Rated".
 *  - Watchlist / lists (⋯ → Export): titles you want to watch.
 * Each row has an IMDb id ("Const") which TMDB can look up directly.
 */

import type { ProgressCallback } from '@/types/import';
import { mapWithConcurrency } from '@/utils/async';
import type { CsvRow } from '@/utils/csv';
import { parseImportDate } from '@/utils/date';
import type { ImportCollector } from './collector';
import type { TmdbResolver } from './resolver';

export type ImdbFileKind = 'ratings' | 'watchlist';

export function detectImdbFile(headers: string[]): ImdbFileKind | null {
  if (!headers.includes('Const')) return null;
  return headers.includes('Position') ? 'watchlist' : 'ratings';
}

export async function importImdbRows(
  rows: CsvRow[],
  kind: ImdbFileKind,
  resolver: TmdbResolver,
  collector: ImportCollector,
  onProgress?: ProgressCallback,
): Promise<void> {
  await mapWithConcurrency(
    rows,
    8,
    async (row) => {
      const imdbId = row['Const'];
      const label = row['Title'] || imdbId;
      const found = imdbId ? await resolver.find(imdbId, 'imdb_id') : null;
      const watchedAt = parseImportDate(row['Date Rated']) ?? parseImportDate(row['Created']) ?? new Date().toISOString();
      const csvRuntime = Number(row['Runtime (mins)']) || 0;

      if (found?.movie) {
        const movie = await resolver.title('movie', found.movie.id);
        if (!movie) return collector.miss(label);
        if (kind === 'watchlist') collector.add(movie.media, 'watchlist');
        else collector.add(movie.media, 'completed', { watchedAt, runtime: csvRuntime || movie.runtime });
      } else if (found?.show) {
        const show = await resolver.title('tv', found.show.id);
        if (!show) return collector.miss(label);
        // A rated series is treated as finished; individual episodes aren't known.
        collector.add(show.media, kind === 'watchlist' ? 'watchlist' : 'completed');
      } else if (found?.episode) {
        const show = await resolver.title('tv', found.episode.showId);
        if (!show) return collector.miss(label);
        if (kind === 'watchlist') return collector.add(show.media, 'watchlist');
        collector.add(show.media, 'watching', {
          watchedAt,
          runtime: found.episode.runtime || csvRuntime || show.runtime,
          seasonNumber: found.episode.seasonNumber,
          episodeNumber: found.episode.episodeNumber,
        });
      } else {
        collector.miss(label);
      }
    },
    onProgress,
  );
}
