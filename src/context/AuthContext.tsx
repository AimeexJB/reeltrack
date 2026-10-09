import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService, backendKind } from '@/services';
import type { BackendKind, RegisterInput } from '@/services/types';
import type { User } from '@/types/user';

interface AuthContextValue {
  user: User | null;
  /** True until we know whether someone is logged in (Supabase checks asynchronously). */
  initializing: boolean;
  backend: BackendKind;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (changes: Partial<Pick<User, 'displayName' | 'avatarUrl'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(
    () =>
      authService.subscribe((nextUser) => {
        setUser(nextUser);
        setInitializing(false);
      }),
    [],
  );

  const updateProfile = useCallback(
    async (changes: Partial<Pick<User, 'displayName' | 'avatarUrl'>>) => {
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
    }),
    [user, initializing, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
