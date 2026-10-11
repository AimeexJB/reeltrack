import { useState } from 'react';
import { imageUrl } from '@/api/tmdb';
import { CastPreviewTrigger } from '@/components/person/CastPreviewTrigger';
import { PersonPreview } from '@/components/person/PersonPreview';
import { Modal } from '@/components/ui/Modal';
import type { CastMember } from '@/types/media';
import styles from './CastList.module.css';

const MODAL_TITLE_ID = 'cast-preview-title';

interface CastListProps {
  cast: CastMember[];
  /** mediaKey of the title being viewed, so previews don't list it as "something else they've been in". */
  currentKey?: string;
}

/** Cast row. Hover (desktop) or tap (mobile) a person to see what else they've been in. */
export function CastList({ cast, currentKey }: CastListProps) {
  const [modalPersonId, setModalPersonId] = useState<number | null>(null);
  if (cast.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Cast</h2>
      <ul className={styles.list}>
        {cast.map((member) => (
          <li key={`${member.id}-${member.character}`} className={styles.member}>
            <CastPreviewTrigger
              personId={member.id}
              label={member.character ? `${member.name} as ${member.character}` : member.name}
              currentKey={currentKey}
              onOpenModal={setModalPersonId}
            >
              {member.profilePath ? (
                <img src={imageUrl(member.profilePath, 'w185')!} alt="" loading="lazy" className={styles.photo} />
              ) : (
                <span className={styles.photo} />
              )}
              <span className={styles.name}>{member.name}</span>
              <span className={styles.character}>{member.character}</span>
            </CastPreviewTrigger>
          </li>
        ))}
      </ul>

      <Modal open={modalPersonId !== null} onClose={() => setModalPersonId(null)} labelledBy={MODAL_TITLE_ID} className={styles.modal}>
        {modalPersonId !== null && (
          <div className={styles.modalBody}>
            <PersonPreview
              key={modalPersonId}
              personId={modalPersonId}
              currentKey={currentKey}
              titleId={MODAL_TITLE_ID}
              expanded
              onNavigate={() => setModalPersonId(null)}
            />
          </div>
        )}
      </Modal>
    </section>
  );
}
