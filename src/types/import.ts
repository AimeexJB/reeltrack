import type { MediaSummary } from './media';
import type { TrackStatus } from './user';

export type ImportSource = 'imdb' | 'tvtime' | 'plex';

export interface ImportedWatch {
  watchedAt: string;
  runtime: number;
  seasonNumber?: number;
  episodeNumber?: number;
  /** Set when files from different services are imported together. */
  source?: ImportSource;
}

/** One title found in an import file, with every viewing of it. */
export interface ImportedItem {
  media: MediaSummary;
  status: TrackStatus;
  watches: ImportedWatch[];
}

export interface ImportResult {
  source: ImportSource;
  items: ImportedItem[];
  /** Rows we couldn't match to a TMDB title (shown to the user so nothing disappears silently). */
  unmatched: string[];
  /** Files that weren't recognised. */
  skippedFiles: string[];
}

export type ProgressCallback = (done: number, total: number) => void;
