import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService, backendKind } from '@/services';
import type { AuthLinkInfo, BackendKind, ProfileChanges, RegisterInput } from '@/services/types';
import type { User } from '@/types/user';

interface AuthContextValue {
  user: User | null;
  /** True until we know whether someone is logged in (Supabase checks asynchronously). */
  initializing: boolean;
  backend: BackendKind;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (changes: ProfileChanges) => Promise<void>;

  /** True when the user arrived from an invite / reset email and must choose a password. */
  needsPassword: boolean;
  /** Set when an emailed link was invalid or expired. */
  authLinkError: string | null;
  /** False for browser-only accounts (no email). */
  supportsPasswordReset: boolean;
  requestPasswordReset: (email: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
}

const NO_LINK: AuthLinkInfo = { needsPassword: false, error: null };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authLink] = useState<AuthLinkInfo>(() => authService.readAuthLink?.() ?? NO_LINK);
  const [needsPassword, setNeedsPassword] = useState(authLink.needsPassword);

  useEffect(
    () =>
      authService.subscribe((nextUser, info) => {
        setUser(nextUser);
        setInitializing(false);
        if (info?.passwordRecovery) setNeedsPassword(true);
      }),
    [],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!authService.requestPasswordReset) throw new Error('Password reset needs cloud accounts.');
    await authService.requestPasswordReset(email);
  }, []);

  const setPassword = useCallback(async (password: string) => {
    if (!authService.setPassword) throw new Error('Password changes need cloud accounts.');
    await authService.setPassword(password);
    setNeedsPassword(false);
  }, []);

  const updateProfile = useCallback(
    async (changes: ProfileChanges) => {
      if (user) setUser(await authService.updateProfile(user.id, changes));
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      backend: backendKind,
      login: authService.login,
      register: authService.register,
      logout: authService.logout,
      updateProfile,
      needsPassword,
      authLinkError: authLink.error,
      supportsPasswordReset: Boolean(authService.requestPasswordReset),
      requestPasswordReset,
      setPassword,
    }),
    [user, initializing, updateProfile, needsPassword, authLink.error, requestPasswordReset, setPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
