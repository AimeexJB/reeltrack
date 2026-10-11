import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { prefetchPerson } from '@/hooks/usePerson';
import { PersonPreview } from './PersonPreview';
import styles from './CastPreviewTrigger.module.css';

const OPEN_DELAY = 300; // don't flash cards while the mouse sweeps across the cast row
const CLOSE_DELAY = 150; // time to move the mouse from the trigger onto the card
const GAP = 8;
const EDGE = 8;

interface CastPreviewTriggerProps {
  personId: number;
  label: string;
  currentKey?: string;
  /** Opens the full pop-up (taps on touch screens, clicks / Enter everywhere). */
  onOpenModal: (personId: number) => void;
  children: ReactNode;
}

const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * A cast member that shows a preview card on hover / keyboard focus (desktop),
 * and opens a pop-up when clicked or tapped (all devices).
 * The card uses the Popover API so it sits in the top layer and can't be clipped by the scrolling row.
 */
export function CastPreviewTrigger({ personId, label, currentKey, onOpenModal, children }: CastPreviewTriggerProps) {
  const queryClient = useQueryClient();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const [cardOpen, setCardOpen] = useState(false);
  // Set while we hand focus back to the trigger after Esc, so that focus doesn't reopen the card.
  const suppressFocusOpen = useRef(false);

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };

  const closeCard = useCallback(() => {
    clearTimers();
    setCardOpen(false);
  }, []);

  const scheduleOpen = () => {
    if (!canHover()) return;
    window.clearTimeout(closeTimer.current);
    void prefetchPerson(queryClient, personId);
    openTimer.current = window.setTimeout(() => setCardOpen(true), OPEN_DELAY);
  };

  const scheduleClose = () => {
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setCardOpen(false), CLOSE_DELAY);
  };

  /** Keep the card open while focus moves between the trigger and links inside the card. */
  const handleFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && (triggerRef.current?.contains(next) || cardRef.current?.contains(next))) return;
    scheduleClose();
  };

  // Show the card in the top layer next to the trigger: below if it fits, otherwise on whichever side
  // has more room (scrolling inside if needed). Re-measure whenever its content changes size —
  // it starts as a small spinner and grows once the person's details load.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const trigger = triggerRef.current;
    if (!cardOpen || !card || !trigger) return;
    if (!card.matches(':popover-open')) card.showPopover();

    const place = () => {
      const anchor = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - anchor.bottom - GAP - EDGE;
      const spaceAbove = anchor.top - GAP - EDGE;
      const naturalHeight = card.scrollHeight;
      const below = naturalHeight <= spaceBelow || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(160, below ? spaceBelow : spaceAbove);
      const height = Math.min(naturalHeight, maxHeight);
      const width = card.offsetWidth;

      card.style.maxHeight = `${maxHeight}px`;
      card.style.top = `${below ? anchor.bottom + GAP : anchor.top - GAP - height}px`;
      card.style.left = `${Math.min(Math.max(EDGE, anchor.left), window.innerWidth - width - EDGE)}px`;
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(card);
    return () => observer.disconnect();
  }, [cardOpen]);

  // Esc closes the card (WCAG 1.4.13); so does scrolling, since the card is pinned to the screen.
  useEffect(() => {
    if (!cardOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // If focus was inside the card, return it to the cast member instead of losing it.
      if (cardRef.current?.contains(document.activeElement)) {
        suppressFocusOpen.current = true;
        triggerRef.current?.focus();
      }
      closeCard();
    };
    const onScroll = (event: Event) => {
      if (!cardRef.current?.contains(event.target as Node)) closeCard();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [cardOpen, closeCard]);

  useEffect(() => clearTimers, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`${label} — see what else they’ve been in`}
        aria-haspopup="dialog"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={(event) => {
          if (suppressFocusOpen.current) {
            suppressFocusOpen.current = false;
            return;
          }
          if (event.currentTarget.matches(':focus-visible')) scheduleOpen();
        }}
        onBlur={handleFocusOut}
        onClick={() => {
          closeCard();
          onOpenModal(personId);
        }}
      >
        {children}
      </button>

      {cardOpen && (
        <div
          ref={cardRef}
          popover="manual"
          className={styles.card}
          aria-label={`${label} details`}
          onMouseEnter={() => window.clearTimeout(closeTimer.current)}
          onMouseLeave={scheduleClose}
          onBlur={handleFocusOut}
        >
          <PersonPreview personId={personId} currentKey={currentKey} onNavigate={closeCard} />
        </div>
      )}
    </>
  );
}
