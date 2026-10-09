import { useParams } from 'react-router';
import { CastList } from '@/components/details/CastList';
import { DetailHero } from '@/components/details/DetailHero';
import { SeasonList } from '@/components/details/SeasonList';
import { MediaRow } from '@/components/media/MediaRow';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useMediaDetails } from '@/hooks/useMediaQueries';
import type { MediaType } from '@/types/media';

/** Handles both /movie/:id and /tv/:id. */
export default function MediaDetailPage({ mediaType }: { mediaType: MediaType }) {
  const id = Number(useParams().id);
  const { data: details, isLoading, error, refetch } = useMediaDetails(mediaType, id);

  if (isLoading) return <Spinner />;
  if (error || !details) return <ErrorMessage error={error ?? new Error('Title not found.')} onRetry={() => refetch()} />;

  // `key` resets per-title UI state (e.g. which season is open) when navigating between titles.
  return (
    <div key={`${mediaType}-${id}`}>
      <DetailHero details={details} />
      {mediaType === 'tv' && <SeasonList show={details} />}
      <CastList cast={details.cast} />
      {details.recommendations.length > 0 && <MediaRow title="More like this" items={details.recommendations} />}
    </div>
  );
}
