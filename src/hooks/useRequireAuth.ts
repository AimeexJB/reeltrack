import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';

/**
 * Wraps an action so logged-out users are sent to the login page instead
 * (and come back here afterwards).
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (action: () => void) => {
      if (user) action();
      else navigate(paths.login, { state: { from: location.pathname } });
    },
    [user, navigate, location.pathname],
  );
}
