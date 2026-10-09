import { imageUrl } from '@/api/tmdb';
import type { CastMember } from '@/types/media';
import styles from './CastList.module.css';

export function CastList({ cast }: { cast: CastMember[] }) {
  if (cast.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Cast</h2>
      <ul className={styles.list}>
        {cast.map((member) => (
          <li key={`${member.id}-${member.character}`} className={styles.member}>
            {member.profilePath ? (
              <img src={imageUrl(member.profilePath, 'w185')!} alt="" loading="lazy" className={styles.photo} />
            ) : (
              <span className={styles.photo} />
            )}
            <p className={styles.name}>{member.name}</p>
            <p className={styles.character}>{member.character}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
