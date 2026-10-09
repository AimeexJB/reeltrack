/**
 * Lets any MediaCard open the Quick View modal. Only one modal exists for the whole app,
 * rendered here, rather than one per card.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { QuickViewModal } from '@/components/quickView/QuickViewModal';
import type { MediaSummary } from '@/types/media';

interface QuickViewContextValue {
  openQuickView: (media: MediaSummary) => void;
}

const QuickViewContext = createContext<QuickViewContextValue | null>(null);

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const locationKey = useRef(location.key);
  locationKey.current = location.key;

  // Remember which page the modal was opened on, so it closes automatically when you navigate away.
  const [state, setState] = useState<{ media: MediaSummary; openedOn: string } | null>(null);
  const media = state?.openedOn === location.key ? state.media : null;

  const openQuickView = useCallback((item: MediaSummary) => setState({ media: item, openedOn: locationKey.current }), []);
  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ openQuickView }), [openQuickView]);

  return (
    <QuickViewContext.Provider value={value}>
      {children}
      <QuickViewModal media={media} onClose={close} />
    </QuickViewContext.Provider>
  );
}

export function useQuickView(): QuickViewContextValue {
  const context = useContext(QuickViewContext);
  if (!context) throw new Error('useQuickView must be used inside <QuickViewProvider>');
  return context;
}
