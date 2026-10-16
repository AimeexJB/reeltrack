import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  /** Omit for the current page (always the last crumb). */
  to?: string;
}

/**
 * "Home › TV Shows › Sherlock" trail for child pages. Installed as a home-screen app there's no
 * browser back button, so this is the way back up.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={styles.list}>
        {items.map((crumb, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className={styles.item}>
              {index > 0 && <ChevronRight size={14} className={styles.separator} aria-hidden />}
              {isCurrent || !crumb.to ? (
                <span className={styles.current} aria-current={isCurrent ? 'page' : undefined}>
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to} className={styles.link}>
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
