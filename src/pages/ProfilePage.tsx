import { useState } from 'react';
import { CustomLists } from '@/components/profile/CustomLists';
import { LibraryShelves } from '@/components/profile/LibraryShelves';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { UpcomingEpisodes } from '@/components/profile/UpcomingEpisodes';
import sectionStyles from '@/components/profile/ProfileSection.module.css';
import { StatsPanel } from '@/components/stats/StatsPanel';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import type { MediaType } from '@/types/media';

/** The user's hub: upcoming episodes, stats, custom lists, then Movies and TV Shows shelves (each with Watchlist / Watching / Completed). */
export default function ProfilePage() {
  const { user } = useAuth();
  const { data, loaded } = useLibrary();
  const [statsType, setStatsType] = useState<MediaType>('tv');

  // ProtectedRoute guarantees a user, but keep TypeScript happy.
  if (!user) return null;
  if (!loaded) return <Spinner />;

  return (
    <>
      <ProfileHeader user={user} />
      <UpcomingEpisodes />

      <section className={sectionStyles.section}>
        <div className={sectionStyles.header}>
          <h2 className={sectionStyles.heading}>Stats</h2>
          <Tabs
            label="Stats type"
            value={statsType}
            onChange={setStatsType}
            options={[
              { value: 'tv', label: 'TV Shows' },
              { value: 'movie', label: 'Movies' },
            ]}
          />
        </div>
        <StatsPanel watches={data.watches} mediaType={statsType} />
      </section>

      <CustomLists lists={data.lists} />
      <LibraryShelves library={data.library} mediaType="movie" />
      <LibraryShelves library={data.library} mediaType="tv" />
    </>
  );
}
