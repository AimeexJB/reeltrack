import { BarChart3, LogIn, LogOut, Settings } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useClickOutside } from '@/hooks/useClickOutside';
import styles from './UserMenu.module.css';

/** Log-in button when logged out; round profile picture with a dropdown when logged in. */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  if (!user) {
    return (
      <Link to={paths.login} className={styles.loginButton}>
        <LogIn size={18} />
        <span>Log in</span>
      </Link>
    );
  }

  const handleLogout = async () => {
    close();
    await logout();
    navigate(paths.home);
  };

  return (
    <div ref={ref} className={styles.container}>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size={38} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.header}>
            <Avatar name={user.displayName} src={user.avatarUrl} size={40} />
            <div>
              <p className={styles.name}>{user.displayName}</p>
              <p className={styles.username}>@{user.username}</p>
            </div>
          </div>
          <Link to={paths.profile} role="menuitem" className={styles.item} onClick={close}>
            <BarChart3 size={16} /> Profile & stats
          </Link>
          <Link to={paths.settings} role="menuitem" className={styles.item} onClick={close}>
            <Settings size={16} /> Import, backup & sync
          </Link>
          <button type="button" role="menuitem" className={styles.item} onClick={handleLogout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
