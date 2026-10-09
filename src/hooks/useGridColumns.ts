import { useEffect, useState, type RefObject } from 'react';

/** How many columns a CSS grid currently has (it changes with screen width). */
export function useGridColumns(ref: RefObject<HTMLElement | null>, fallback = 6): number {
  const [columns, setColumns] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const tracks = getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (tracks > 0) setColumns(tracks);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return columns;
}
