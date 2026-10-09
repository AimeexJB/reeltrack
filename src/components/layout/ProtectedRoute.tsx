import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';

/** Sends logged-out visitors to the login page, then back here after logging in. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Spinner />;

  if (!user) return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  return children;
}
