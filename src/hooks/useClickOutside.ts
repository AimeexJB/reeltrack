import { useEffect, type RefObject } from 'react';

/** Calls `onOutside` when the user clicks outside `ref` or presses Escape (for dropdowns/menus). */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;

    const handlePointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOutside();
    };

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, onOutside, active]);
}
