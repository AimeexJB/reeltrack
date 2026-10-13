/**
 * After a new deploy, a tab opened earlier still asks for the previous build's file names, which no
 * longer exist. Reloading once fetches the new index.html and everything works again.
 */

const RELOAD_KEY = 'reeltrack:reloaded-for-new-version';
/** Don't reload again within this window — avoids a reload loop if something else is wrong. */
const COOLDOWN_MS = 60_000;

/** True for the errors browsers/Vite throw when a code-split file can't be loaded. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading (CSS )?chunk/i.test(
    message,
  );
}

/** Reloads the page to pick up the latest version. Returns false if we already tried very recently. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    if (last && Date.now() - last < COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode) — still try one reload.
  }
  window.location.reload();
  return true;
}
