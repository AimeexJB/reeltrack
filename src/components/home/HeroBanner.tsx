import { Info, Star } from 'lucide-react';
import { Link } from 'react-router';
import { imageUrl } from '@/api/tmdb';
import { HERO_LIST } from '@/constants/mediaLists';
import { MEDIA_TYPE_LABELS } from '@/constants/tracking';
import { paths } from '@/constants/routes';
import { useMediaList } from '@/hooks/useMediaQueries';
import { getYear } from '@/utils/date';
import styles from './HeroBanner.module.css';

/** Big featured banner at the top of the home page: today's #1 trending title. */
export function HeroBanner() {
  const { data } = useMediaList(HERO_LIST.path);
  const featured = data?.results.find((media) => media.backdropPath);

  if (!featured) return <div className={styles.placeholder} />;

  return (
    <section className={styles.hero}>
      <img src={imageUrl(featured.backdropPath, 'w1280')!} alt="" className={styles.backdrop} fetchPriority="high" />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <p className={styles.eyebrow}>#1 trending today</p>
        <h1 className={styles.title}>{featured.title}</h1>
        <p className={styles.meta}>
          {MEDIA_TYPE_LABELS[featured.mediaType].singular}
          {getYear(featured.releaseDate) && ` · ${getYear(featured.releaseDate)}`}
          {featured.rating > 0 && (
            <span className={styles.rating}>
              <Star size={14} fill="currentColor" /> {featured.rating.toFixed(1)}
            </span>
          )}
        </p>
        <p className={styles.overview}>{featured.overview}</p>
        <Link to={paths.media(featured.mediaType, featured.id)} className={styles.cta}>
          <Info size={18} /> View details
        </Link>
      </div>
    </section>
  );
}
