import { X } from 'lucide-react';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog (usually its heading). */
  labelledBy: string;
  children: ReactNode;
  className?: string;
}

// Safari doesn't support `closedby` yet, so we handle backdrop clicks ourselves there.
const SUPPORTS_CLOSEDBY = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

/**
 * Accessible modal built on the native <dialog> element: the browser handles focus trapping,
 * Esc to close, and putting it above everything else. Clicking the backdrop also closes it.
 */
export function Modal({ open, onClose, labelledBy, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // The browser fires the native "close" event a moment *after* a dialog closes. If the parent already
  // knows about the close (we told it, or it asked for it), that late event must be ignored — otherwise
  // it could shut a dialog the user has just reopened.
  const ignoreNextCloseEvent = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      ignoreNextCloseEvent.current = true;
      dialog.close();
    }
  }, [open]);

  /** Tell the parent straight away when the user closes the dialog (✕, Esc, clicking outside). */
  const closeFromUser = () => {
    ignoreNextCloseEvent.current = true;
    onClose();
  };

  /** Fallback for closes we weren't told about in advance (e.g. light dismiss in some browsers). */
  const handleCloseEvent = () => {
    if (ignoreNextCloseEvent.current) {
      ignoreNextCloseEvent.current = false;
      return;
    }
    onClose();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (SUPPORTS_CLOSEDBY || event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const insideContent =
      rect.top <= event.clientY && event.clientY <= rect.bottom && rect.left <= event.clientX && event.clientX <= rect.right;
    if (!insideContent) closeFromUser();
  };

  return (
    <dialog
      ref={ref}
      closedby="any"
      aria-labelledby={labelledBy}
      // Esc and light dismiss fire "cancel" right away, before the native close happens.
      onCancel={closeFromUser}
      onClose={handleCloseEvent}
      onClick={handleBackdropClick}
      className={[styles.modal, className].filter(Boolean).join(' ')}
    >
      <button type="button" className={styles.close} onClick={closeFromUser} aria-label="Close">
        <X size={20} />
      </button>
      {children}
    </dialog>
  );
}
