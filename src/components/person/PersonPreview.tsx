import { Link } from 'react-router';
import { imageUrl } from '@/api/tmdb';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { paths } from '@/constants/routes';
import { usePerson, useSeenIn, type SeenStatus } from '@/hooks/usePerson';
import type { PersonCredit } from '@/types/media';
import { getAge, getYear } from '@/utils/date';
import { pluralize } from '@/utils/format';
import { mediaKey } from '@/utils/media';
import styles from './PersonPreview.module.css';

const SEEN_LABELS: Record<SeenStatus, string> = {
  completed: 'Completed',
  watched: 'Watched',
  watching: 'Watching',
  watchlist: 'Watchlist',
};

interface PersonPreviewProps {
  personId: number;
  /** The title whose page we're on — left out of the lists (you already know them from it). */
  currentKey?: string;
  /** id for the name heading, so a dialog can be labelled by it. */
  titleId?: string;
  /** Larger layout for the pop-up (more bio, more titles). */
  expanded?: boolean;
  /** Called when a title link is followed, so the card / pop-up can close. */
  onNavigate?: () => void;
}

/** "Where do I know them from?" — bio, quick facts, titles from your library, and best-known work. */
export function PersonPreview({ personId, currentKey, titleId, expanded = false, onNavigate }: PersonPreviewProps) {
  const { data: person, isLoading, error } = usePerson(personId);
  const seenIn = useSeenIn(person, currentKey);

  if (isLoading) return <Spinner label="Loading cast member" />;
  if (error || !person) return <ErrorMessage error={error ?? new Error('Couldn’t load this person.')} />;

  const seenKeys = new Set(seenIn.map(({ credit }) => mediaKey(credit)));
  const knownFor = person.credits.filter((credit) => mediaKey(credit) !== currentKey && !seenKeys.has(mediaKey(credit))).slice(0, expanded ? 12 : 8);
  const photo = imageUrl(person.profilePath, 'w185');

  const facts = [
    person.knownForDepartment,
    person.birthday && (person.deathday ? `Died aged ${getAge(person.birthday, person.deathday)}` : `Age ${getAge(person.birthday)}`),
    person.placeOfBirth && `Born in ${person.placeOfBirth}`,
  ].filter(Boolean);

  return (
    <div className={styles.preview} data-expanded={expanded}>
      <header className={styles.header}>
        {photo ? <img src={photo} alt="" className={styles.photo} /> : <span className={styles.photo} />}
        <div className={styles.identity}>
          <h3 id={titleId} className={styles.name}>
            {person.name}
          </h3>
          <p className={styles.facts}>{facts.join(' · ')}</p>
          <p className={styles.count}>{pluralize(person.credits.length, 'movie & TV credit')}</p>
        </div>
      </header>

      {person.biography && <p className={styles.bio}>{person.biography}</p>}

      {seenIn.length > 0 && (
        <section>
          <h4 className={styles.heading}>You’ve seen them in</h4>
          <ul className={styles.seenList}>
            {seenIn.map(({ credit, status }) => (
              <li key={mediaKey(credit)}>
                <Link to={paths.media(credit.mediaType, credit.id)} className={styles.seen} onClick={onNavigate}>
                  <span className={styles.seenTitle}>{credit.title}</span>
                  <span className={styles.badge} data-status={status}>
                    {SEEN_LABELS[status]}
                  </span>
                  {credit.character && <span className={styles.character}>as {credit.character}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {knownFor.length > 0 && (
        <section>
          <h4 className={styles.heading}>Best known for</h4>
          <ul className={styles.posters}>
            {knownFor.map((credit) => (
              <KnownForCard key={mediaKey(credit)} credit={credit} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function KnownForCard({ credit, onNavigate }: { credit: PersonCredit; onNavigate?: () => void }) {
  const poster = imageUrl(credit.posterPath, 'w154');
  const year = getYear(credit.releaseDate);
  return (
    <li>
      <Link to={paths.media(credit.mediaType, credit.id)} className={styles.poster} onClick={onNavigate} title={credit.title}>
        {poster ? <img src={poster} alt="" loading="lazy" /> : <span className={styles.posterPlaceholder}>{credit.title}</span>}
        <span className={styles.posterTitle}>{credit.title}</span>
        <span className={styles.posterMeta}>
          {[year, credit.character && `as ${credit.character}`].filter(Boolean).join(' · ')}
        </span>
      </Link>
    </li>
  );
}
