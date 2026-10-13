import { useQueryClient } from '@tanstack/react-query';
import { ChevronUp, Users } from 'lucide-react';
import { useState } from 'react';
import { imageUrl } from '@/api/tmdb';
import { PersonPreview } from '@/components/person/PersonPreview';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useFullCast } from '@/hooks/useMediaQueries';
import { prefetchPerson } from '@/hooks/usePerson';
import type { CastMember, MediaType } from '@/types/media';
import { pluralize } from '@/utils/format';
import styles from './CastList.module.css';

const MODAL_TITLE_ID = 'cast-preview-title';

interface CastListProps {
  /** Top-billed cast, shown in the row. */
  cast: CastMember[];
  mediaType: MediaType;
  mediaId: number;
}

/**
 * Cast row (top billed) with a "Show full cast" button that expands into a grid of everyone.
 * Click or tap a person to see their bio and what else they've been in.
 */
export function CastList({ cast, mediaType, mediaId }: CastListProps) {
  const [personId, setPersonId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fullCast = useFullCast(mediaType, mediaId, expanded);
  const currentKey = `${mediaType}:${mediaId}`;
  if (cast.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Cast</h2>

      {!expanded ? (
        <ul className={styles.list}>
          {cast.map((member) => (
            <li key={`${member.id}-${member.character}`}>
              <CastCard member={member} onOpen={setPersonId} />
            </li>
          ))}
        </ul>
      ) : fullCast.isLoading ? (
        <Spinner label="Loading full cast" />
      ) : fullCast.error ? (
        <ErrorMessage error={fullCast.error} onRetry={() => fullCast.refetch()} />
      ) : (
        <ul className={styles.grid}>
          {(fullCast.data ?? []).map((member) => (
            <li key={`${member.id}-${member.character}`}>
              <CastCard member={member} onOpen={setPersonId} />
            </li>
          ))}
        </ul>
      )}

      <Button size="sm" variant="ghost" className={styles.toggle} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        {expanded ? (
          <>
            <ChevronUp size={16} /> Show less
          </>
        ) : (
          <>
            <Users size={16} /> Show full cast
          </>
        )}
      </Button>

      <Modal open={personId !== null} onClose={() => setPersonId(null)} labelledBy={MODAL_TITLE_ID} className={styles.modal}>
        {personId !== null && (
          <div className={styles.modalBody}>
            <PersonPreview
              key={personId}
              personId={personId}
              currentKey={currentKey}
              titleId={MODAL_TITLE_ID}
              expanded
              onNavigate={() => setPersonId(null)}
            />
          </div>
        )}
      </Modal>
    </section>
  );
}

/** One cast member: photo, name, character (and episode count for TV). Used in both the row and the grid. */
function CastCard({ member, onOpen }: { member: CastMember; onOpen: (personId: number) => void }) {
  const queryClient = useQueryClient();
  const prefetch = () => void prefetchPerson(queryClient, member.id);

  return (
    <button
      type="button"
      className={styles.trigger}
      aria-haspopup="dialog"
      aria-label={`${member.character ? `${member.name} as ${member.character}` : member.name} — see what else they’ve been in`}
      // Start loading on hover/focus so the pop-up is usually ready the moment it opens.
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onClick={() => onOpen(member.id)}
    >
      {member.profilePath ? (
        <img src={imageUrl(member.profilePath, 'w185')!} alt="" loading="lazy" className={styles.photo} />
      ) : (
        <span className={styles.photo} />
      )}
      <span className={styles.name}>{member.name}</span>
      <span className={styles.character}>{member.character}</span>
      {member.episodeCount !== undefined && <span className={styles.episodes}>{pluralize(member.episodeCount, 'ep')}</span>}
    </button>
  );
}
