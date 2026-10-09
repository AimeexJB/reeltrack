import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import styles from './SearchInput.module.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

/** Large search box on the search page. Typing is debounced before updating the URL. */
export function SearchInput({ value, onChange }: SearchInputProps) {
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const debounced = useDebounce(text.trim(), 350);

  // If the URL changes from elsewhere (e.g. the top-bar search), show the new query here.
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // Only react to the user's typing, not to `value` changing underneath us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={styles.wrapper}>
      <Search size={22} className={styles.icon} aria-hidden />
      <input
        type="search"
        className={styles.input}
        placeholder="Search by title…"
        aria-label="Search by title"
        value={text}
        onChange={(event) => setText(event.target.value)}
        autoFocus={!value}
      />
    </div>
  );
}
