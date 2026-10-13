import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { reloadForNewVersion } from '@/utils/appVersion';
import '@/styles/globals.css';

// Vite fires this when a page's code or CSS can't be loaded — usually because a new version was
// deployed while this tab was open. Reload once to get the new version instead of showing an error.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
