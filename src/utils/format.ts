/** 754 → "12.6" (hours, one decimal). */
export function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours >= 100 ? Math.round(hours).toLocaleString() : hours.toFixed(1).replace(/\.0$/, '');
}

/** 4000 → "2d 18h 40m" — used for big lifetime totals. */
export function formatLongDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.round(minutes % 60);
  return [days && `${days}d`, hours && `${hours}h`, `${mins}m`].filter(Boolean).join(' ');
}

/** 125 → "2h 5m" */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export function episodeCode(season: number, episode: number): string {
  return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
}
