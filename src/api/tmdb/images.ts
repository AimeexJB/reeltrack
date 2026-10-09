const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type ProfileSize = 'w45' | 'w185' | 'h632';

/** Builds a TMDB image URL. Pick the smallest size that looks sharp — it keeps the app fast. */
export function imageUrl(path: string | null, size: PosterSize | BackdropSize | ProfileSize): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}
