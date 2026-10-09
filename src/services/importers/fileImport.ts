/** Reads one or more CSV files, works out which service they came from, and resolves every row. */

import type { ImportResult, ImportSource, ProgressCallback } from '@/types/import';
import { parseCsv } from '@/utils/csv';
import { ImportCollector } from './collector';
import { detectImdbFile, importImdbRows } from './imdb';
import { TmdbResolver } from './resolver';
import { importTvTimeRows, isTvTimeFile } from './tvtime';

export async function importFiles(files: File[], onProgress?: ProgressCallback): Promise<ImportResult> {
  const parsed = await Promise.all(files.map(async (file) => ({ file, ...parseCsv(await file.text()) })));
  const resolver = new TmdbResolver();

  const imdbFiles = parsed.filter(({ headers }) => detectImdbFile(headers));
  const tvTimeFiles = parsed.filter(({ headers }) => !detectImdbFile(headers) && isTvTimeFile(headers));
  const source: ImportSource = imdbFiles.length >= tvTimeFiles.length ? 'imdb' : 'tvtime';
  const collector = new ImportCollector(source);

  const total = [...imdbFiles, ...tvTimeFiles].reduce((sum, { rows }) => sum + rows.length, 0);
  let doneBefore = 0;
  const progress = (done: number) => onProgress?.(doneBefore + done, total);

  for (const { file, headers, rows } of parsed) {
    const imdbKind = detectImdbFile(headers);
    if (imdbKind) {
      collector.currentSource = 'imdb';
      await importImdbRows(rows, imdbKind, resolver, collector, progress);
    } else if (isTvTimeFile(headers)) {
      collector.currentSource = 'tvtime';
      await importTvTimeRows(rows, resolver, collector, progress);
    } else {
      collector.skipFile(file.name);
    }
    doneBefore += imdbKind || isTvTimeFile(headers) ? rows.length : 0;
  }
  return collector.result();
}
