import { useEffect, useState } from 'react';

/** Returns `value` only after it has stopped changing for `delay` ms (avoids an API call per keystroke). */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
