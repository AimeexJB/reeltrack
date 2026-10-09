/** Local date as YYYY-MM-DD (TMDB's date format). */
export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function getYear(date: string | null | undefined): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

export function hasAired(airDate: string | null): boolean {
  return Boolean(airDate) && airDate! <= todayIso();
}

/** Monday 00:00 of the current week, local time. */
export function startOfWeek(now: Date): Date {
  const start = new Date(now);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function monthsAgo(now: Date, months: number): Date {
  const date = new Date(now);
  date.setMonth(date.getMonth() - months);
  return date;
}

export function formatDate(date: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  if (!date) return 'TBA';
  return new Intl.DateTimeFormat(undefined, options).format(new Date(date));
}

export function formatRelativeTime(iso: string, now = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

/**
 * Parses dates from import files into ISO strings. Accepts "2024-05-01", "2024-05-01 20:15:00",
 * full ISO strings and Unix timestamps. Date-only values are set to midday so time zones can't
 * shift them to the previous day; date-times without a zone are treated as UTC. Returns null if the value isn't a date.
 */
export function parseImportDate(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' || /^\d{9,13}$/.test(value)) {
    const number = Number(value);
    return new Date(number < 1e12 ? number * 1000 : number).toISOString();
  }
  let text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text = `${text}T12:00:00`;
  // Exported timestamps without a time zone ("2024-05-01 20:15:00") are UTC.
  else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text)) text = `${text.replace(' ', 'T')}Z`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Whole days from today until a YYYY-MM-DD date (0 = today, 1 = tomorrow). */
export function daysUntil(date: string, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [year, month, day] = date.split('-').map(Number);
  return Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86_400_000);
}

/** "Today", "Tomorrow", "Friday" (within a week), otherwise "17 Oct" (plus the year if it isn't this year). */
export function formatAirDay(date: string, now = new Date()): string {
  const days = daysUntil(date, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  if (days > 1 && days < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(value);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    ...(year !== now.getFullYear() && { year: 'numeric' }),
  }).format(value);
}
