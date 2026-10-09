import { Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { MediaRow } from '@/components/media/MediaRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import styles from './RecommendedRow.module.css';

const TITLE = 'Recommended for You';

export function RecommendedRow() {
  const { user } = useAuth();
  const { items, isLoading, hasSeeds } = useRecommendations();

  if (!user || !hasSeeds) {
    return (
      <MediaRow
        title={TITLE}
        items={[]}
        empty={
          <EmptyState
            icon={Sparkles}
            title={user ? 'Start tracking to get recommendations' : 'Log in for personalised picks'}
            description={
              user
                ? 'Add movies or shows to your watchlist, or mark them as watched, and we’ll suggest what to watch next.'
                : 'Track what you watch and we’ll recommend titles based on your watchlist and history.'
            }
            action={!user && <Link to={paths.login} className={styles.loginLink}>{import.meta.env.VITE_ALLOW_SIGNUPS === 'false' ? 'Log in' : 'Log in or sign up'}</Link>}
          />
        }
      />
    );
  }

  return <MediaRow title={TITLE} subtitle="Based on your watchlist and watch history" items={items} isLoading={isLoading} />;
}
