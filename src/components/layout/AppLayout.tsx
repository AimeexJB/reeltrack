import { Suspense, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { isTmdbConfigured } from '@/api/tmdb';
import { Spinner } from '@/components/ui/Spinner';
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
