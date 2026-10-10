import { Suspense, useEffect, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router';
import { isTmdbConfigured } from '@/api/tmdb';
import { Spinner } from '@/components/ui/Spinner';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { QuickViewProvider } from '@/context/QuickViewContext';
import { useAutoCompleteShows } from '@/hooks/useAutoCompleteShows';
import { useBackfillAnimeInfo } from '@/hooks/useBackfillAnimeInfo';
import { ConfigBanner } from './ConfigBanner';
import { Sidebar } from './Sidebar';
import { SyncErrorBanner } from './SyncErrorBanner';
import { TopBar } from './TopBar';
import styles from './AppLayout.module.css';

/** The frame around every page: sidebar on the left, top bar above the page content. */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useAutoCompleteShows();
  useBackfillAnimeInfo();

  // Arrived from an invite / reset-password email (or an expired link)? Go and set a password.
  // Wait until auth has initialised: Supabase reads the sign-in tokens from the URL first, and
  // navigating earlier would wipe them before the user is signed in.
  const { needsPassword, authLinkError, initializing } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (initializing) return;
    if ((needsPassword || authLinkError) && pathname !== paths.resetPassword) navigate(paths.resetPassword, { replace: true });
    // Only when these change — not on every navigation afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsPassword, authLinkError, initializing]);

  return (
    <QuickViewProvider>
      <div className={styles.layout}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={styles.main}>
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className={styles.content}>
            {!isTmdbConfigured && <ConfigBanner />}
            <SyncErrorBanner />
            <Suspense fallback={<Spinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        <ScrollRestoration />
      </div>
    </QuickViewProvider>
  );
}
