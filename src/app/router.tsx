import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Each page is code-split, so the first load only downloads what the current page needs.
const HomePage = lazy(() => import('@/pages/HomePage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const MoviesPage = lazy(() => import('@/pages/MoviesPage'));
const TvShowsPage = lazy(() => import('@/pages/TvShowsPage'));
const MediaDetailPage = lazy(() => import('@/pages/MediaDetailPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'movies', element: <MoviesPage /> },
      { path: 'tv-shows', element: <TvShowsPage /> },
      { path: 'movie/:id', element: <MediaDetailPage mediaType="movie" /> },
      { path: 'tv/:id', element: <MediaDetailPage mediaType="tv" /> },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      { path: 'login', element: <LoginPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
