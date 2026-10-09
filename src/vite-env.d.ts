/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TMDB_TOKEN?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_KEY?: string;
  /** 'true' in production: TMDB requests go through the Worker proxy, so no token is shipped to the browser. */
  readonly VITE_TMDB_PROXY?: string;
  /** 'false' hides "Create an account" (sign-ups are also disabled in Supabase). */
  readonly VITE_ALLOW_SIGNUPS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
