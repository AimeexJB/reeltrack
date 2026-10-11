import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { imageUrl } from '@/api/tmdb';
import { PersonPreview } from '@/components/person/PersonPreview';
import { Modal } from '@/components/ui/Modal';
import { prefetchPerson } from '@/hooks/usePerson';
import type { CastMember } from '@/types/media';
import styles from './CastList.module.css';

const MODAL_TITLE_ID = 'cast-preview-title';

interface CastListProps {
  cast: CastMember[];
  /** mediaKey of the title being viewed, so the preview doesn't list it as "something else they've been in". */
  currentKey?: string;
}

/** Cast row. Click or tap a person to see their bio and what else they've been in. */
export function CastList({ cast, currentKey }: CastListProps) {
  const queryClient = useQueryClient();
  const [personId, setPersonId] = useState<number | null>(null);
  if (cast.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Cast</h2>
      <ul className={styles.list}>
        {cast.map((member) => (
          <li key={`${member.id}-${member.character}`} className={styles.member}>
            <button
              type="button"
              className={styles.trigger}
              aria-haspopup="dialog"
              aria-label={`${member.character ? `${member.name} as ${member.character}` : member.name} — see what else they’ve been in`}
              // Start loading on hover/focus so the pop-up is usually ready the moment it opens.
              onPointerEnter={() => void prefetchPerson(queryClient, member.id)}
              onFocus={() => void prefetchPerson(queryClient, member.id)}
              onClick={() => setPersonId(member.id)}
            >
              {member.profilePath ? (
                <img src={imageUrl(member.profilePath, 'w185')!} alt="" loading="lazy" className={styles.photo} />
              ) : (
                <span className={styles.photo} />
              )}
              <span className={styles.name}>{member.name}</span>
              <span className={styles.character}>{member.character}</span>
            </button>
          </li>
        ))}
      </ul>

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
