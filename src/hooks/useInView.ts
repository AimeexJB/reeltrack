import { useEffect, useRef, useState } from 'react';

/**
 * Becomes true once the element scrolls near the viewport.
 * Used to lazy-load home-page rows and to trigger infinite scrolling.
 */
export function useInView<T extends HTMLElement>({ rootMargin = '300px', once = true } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, once]);

  return [ref, inView] as const;
}
