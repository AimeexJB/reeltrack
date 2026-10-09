/**
 * TV Time data exports (requested from TV Time support / privacy settings) arrive as several CSV files.
 * The format isn't officially documented, so this looks for the column names that exports are known
 * to use (e.g. seen_episode.csv, followed_tv_show.csv) and tries a few alternatives for each.
 * Shows are matched by TVDB id when present (TV Time uses TVDB), otherwise by name.
 */

import type { ProgressCallback } from '@/types/import';
import { mapWithConcurrency } from '@/utils/async';
import { pickColumn, type CsvRow } from '@/utils/csv';
import { parseImportDate } from '@/utils/date';
import type { ImportCollector } from './collector';
import type { ResolvedTitle, TmdbResolver } from './resolver';

const COLUMNS = {
  showName: ['tv_show_name', 'show_name', 'series_name'],
  showTvdbId: ['tv_show_id', 'show_tvdb_id', 'tvdb_show_id', 'show_id'],
  season: ['episode_season_number', 'season_number', 'season'],
  episode: ['episode_number', 'number', 'episode'],
  episodeTvdbId: ['episode_id', 'episode_tvdb_id'],
  date: ['watched_at', 'created_at', 'updated_at', 'date'],
  movieName: ['movie_name', 'movie_title'],
  movieYear: ['movie_year', 'year', 'release_year'],
  type: ['type', 'entity_type', 'status'],
};

const ALL_COLUMNS = Object.values(COLUMNS).flat();

export function isTvTimeFile(headers: string[]): boolean {
  return headers.some((header) => ['tv_show_name', 'episode_season_number', 'movie_name', 'tv_show_id'].includes(header))
    || headers.filter((header) => ALL_COLUMNS.includes(header)).length >= 3;
}

const toNumber = (value: string) => (value && Number.isFinite(Number(value)) ? Number(value) : undefined);

export async function importTvTimeRows(rows: CsvRow[], resolver: TmdbResolver, collector: ImportCollector, onProgress?: ProgressCallback) {
  async function resolveShow(row: CsvRow): Promise<ResolvedTitle | null> {
    const tvdbId = pickColumn(row, COLUMNS.showTvdbId);
    if (tvdbId) {
      const found = await resolver.find(tvdbId, 'tvdb_id');
      if (found?.show) return resolver.title('tv', found.show.id);
    }
    const name = pickColumn(row, COLUMNS.showName);
    return name ? resolver.search('tv', name) : null;
  }

  await mapWithConcurrency(
    rows,
    6,
    async (row) => {
      const watchedAt = parseImportDate(pickColumn(row, COLUMNS.date)) ?? new Date().toISOString();
      const type = pickColumn(row, COLUMNS.type).toLowerCase();
      const wantsToWatch = /follow|watchlist|want/.test(type);

      // Movies
      const movieName = pickColumn(row, COLUMNS.movieName);
      if (movieName) {
        const movie = await resolver.search('movie', movieName, toNumber(pickColumn(row, COLUMNS.movieYear)));
        if (!movie) return collector.miss(movieName);
        return wantsToWatch
          ? collector.add(movie.media, 'watchlist')
          : collector.add(movie.media, 'completed', { watchedAt, runtime: movie.runtime });
      }

      // Episodes
      let season = toNumber(pickColumn(row, COLUMNS.season));
      let episode = toNumber(pickColumn(row, COLUMNS.episode));
      let show = await resolveShow(row);
      let runtime = show?.runtime;

      // Some exports only have the episode's TVDB id — ask TMDB which show/season/episode it is.
      const episodeTvdbId = pickColumn(row, COLUMNS.episodeTvdbId);
      if ((season === undefined || episode === undefined || !show) && episodeTvdbId) {
        const found = await resolver.find(episodeTvdbId, 'tvdb_id');
        if (found?.episode) {
          show = await resolver.title('tv', found.episode.showId);
          season = found.episode.seasonNumber;
          episode = found.episode.episodeNumber;
          runtime = found.episode.runtime ?? show?.runtime;
        }
      }

      const label = pickColumn(row, COLUMNS.showName) || episodeTvdbId || 'Unknown show';
      if (!show) return collector.miss(label);

      if (season !== undefined && episode !== undefined) {
        collector.add(show.media, 'watching', { watchedAt, runtime: runtime ?? show.runtime, seasonNumber: season, episodeNumber: episode });
      } else {
        // A followed show with no episode info (e.g. followed_tv_show.csv).
        collector.add(show.media, 'watchlist');
      }
    },
    onProgress,
  );
}
