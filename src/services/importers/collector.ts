/** Gathers rows from import files into one item per title. */

import type { ImportedItem, ImportedWatch, ImportResult, ImportSource } from '@/types/import';
import type { MediaSummary } from '@/types/media';
import type { TrackStatus } from '@/types/user';
import { mediaKey } from '@/utils/media';

const RANK: Record<TrackStatus, number> = { watchlist: 0, watching: 1, completed: 2 };

export class ImportCollector {
  private items = new Map<string, ImportedItem>();
  private unmatched: string[] = [];
  private skippedFiles: string[] = [];

  constructor(private source: ImportSource) {}

  /** Which service the rows being added right now came from (when mixing IMDb + TV Time files). */
  currentSource: ImportSource | undefined;

  add(media: MediaSummary, status: TrackStatus, watch?: ImportedWatch): void {
    const key = mediaKey(media);
    const item = this.items.get(key) ?? { media, status, watches: [] };
    if (RANK[status] > RANK[item.status]) item.status = status;
    if (watch) item.watches.push({ ...watch, source: this.currentSource ?? this.source });
    this.items.set(key, item);
  }

  miss(description: string): void {
    this.unmatched.push(description);
  }

  skipFile(name: string): void {
    this.skippedFiles.push(name);
  }

  result(): ImportResult {
    return { source: this.source, items: [...this.items.values()], unmatched: this.unmatched, skippedFiles: this.skippedFiles };
  }
}
