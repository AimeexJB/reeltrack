/**
 * Picks the backend: Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_KEY are set,
 * otherwise everything stays in this browser.
 */

import { localAuthService } from './local/authService';
import { localLibraryService } from './local/libraryService';
import { isSupabaseConfigured } from './supabase/client';
import { supabaseAuthService } from './supabase/authService';
import { supabaseLibraryService } from './supabase/libraryService';
import type { BackendKind } from './types';

export const backendKind: BackendKind = isSupabaseConfigured ? 'supabase' : 'local';
export const authService = isSupabaseConfigured ? supabaseAuthService : localAuthService;
export const libraryService = isSupabaseConfigured ? supabaseLibraryService : localLibraryService;
