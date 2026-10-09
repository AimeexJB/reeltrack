/**
 * Safe JSON wrapper around localStorage.
 * All persistence goes through here, so swapping to a real backend later only touches `services/`.
 */

const PREFIX = 'reeltrack:';

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save "${key}"`, error);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // Storage unavailable (private mode etc.) — nothing to remove.
    }
  },
};
