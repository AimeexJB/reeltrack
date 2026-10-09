import { Film, Home, Search, Settings, Tv, User, X, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { APP_NAME } from '@/constants/defaults';
import { paths } from '@/constants/routes';
import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const BROWSE_ITEMS: NavItem[] = [
  { to: paths.home, label: 'Home', icon: Home },
  { to: paths.search, label: 'Search', icon: Search },
  { to: paths.movies, label: 'Movies', icon: Film },
  { to: paths.tvShows, label: 'TV Shows', icon: Tv },
];

const LIBRARY_ITEMS: NavItem[] = [
  { to: paths.profile, label: 'My Profile', icon: User },
  { to: paths.settings, label: 'Import & Sync', icon: Settings },
];

interface SidebarProps {
  /** Only used on small screens, where the sidebar slides in over the page. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const renderItems = (items: NavItem[]) =>
    items.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === paths.home}
        onClick={onClose}
        className={({ isActive }) => [styles.link, isActive && styles.active].filter(Boolean).join(' ')}
      >
        <Icon size={20} />
        {label}
      </NavLink>
    ));

  return (
    <>
      <div className={[styles.backdrop, open && styles.backdropVisible].filter(Boolean).join(' ')} onClick={onClose} aria-hidden />
      <aside className={[styles.sidebar, open && styles.open].filter(Boolean).join(' ')}>
        <div className={styles.brand}>
          <NavLink to={paths.home} onClick={onClose} className={styles.logo}>
            <img src="/favicon.svg" alt="" width={30} height={30} />
            {APP_NAME}
          </NavLink>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Main">
          <p className={styles.heading}>Browse</p>
          {renderItems(BROWSE_ITEMS)}
          <p className={styles.heading}>Library</p>
          {renderItems(LIBRARY_ITEMS)}
        </nav>

        <p className={styles.credit}>
          Data from{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            TMDB
          </a>
        </p>
      </aside>
    </>
  );
}
