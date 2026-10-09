/** Usernames: 3–30 lowercase letters, numbers, dots or underscores (matches the Supabase schema check). */
const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;

export const USERNAME_RULES = '3–30 characters: letters, numbers, dots or underscores.';

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Returns an error message, or null if the username is valid. */
export function validateUsername(username: string): string | null {
  return USERNAME_PATTERN.test(normalizeUsername(username)) ? null : `Username must be ${USERNAME_RULES}`;
}

export const DISPLAY_NAME_MAX = 50;

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Display name can’t be empty.';
  if (trimmed.length > DISPLAY_NAME_MAX) return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer.`;
  return null;
}
