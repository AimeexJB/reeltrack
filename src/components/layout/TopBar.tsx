import { Menu } from 'lucide-react';
import { useLocation } from 'react-router';
import { SearchBar } from '@/components/search/SearchBar';
import { paths } from '@/constants/routes';
import { UserMenu } from './UserMenu';
import styles from './TopBar.module.css';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  // The search page has its own big search box, so don't show a second one up here.
  const onSearchPage = useLocation().pathname === paths.search;

  return (
    <header className={styles.topBar}>
      <button type="button" className={styles.menuButton} onClick={onMenuClick} aria-label="Open menu">
        <Menu size={22} />
      </button>
      {onSearchPage ? <div className={styles.spacer} /> : <SearchBar />}
      <UserMenu />
    </header>
  );
}
