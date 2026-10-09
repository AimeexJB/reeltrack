import styles from './Tabs.module.css';

interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}

/** Pill-style segmented control. */
export function Tabs<T extends string>({ options, value, onChange, label }: TabsProps<T>) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={styles.tab}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
        </button>
      ))}
    </div>
  );
}
