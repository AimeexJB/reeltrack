import { Search } from 'lucide-react';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { imageUrl } from '@/api/tmdb';
import { MEDIA_TYPE_LABELS } from '@/constants/tracking';
import { paths } from '@/constants/routes';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuickSearch } from '@/hooks/useMediaQueries';
import { getYear } from '@/utils/date';
import styles from './SearchBar.module.css';

const MAX_QUICK_RESULTS = 6;

/** Top-bar search: shows instant results as you type; Enter opens the full search page. */
export function SearchBar() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  const query = useDebounce(text.trim(), 250);
  const { data, isFetching } = useQuickSearch(query);
  const results = data?.results.slice(0, MAX_QUICK_RESULTS) ?? [];
  const showDropdown = open && query.length >= 2;

  const goToSearchPage = (event?: FormEvent) => {
    event?.preventDefault();
    if (!text.trim()) return;
    close();
    navigate(`${paths.search}?q=${encodeURIComponent(text.trim())}`);
  };

  const handleSelect = () => {
    close();
    setText('');
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <form role="search" onSubmit={goToSearchPage} className={styles.form}>
        <Search size={18} className={styles.icon} aria-hidden />
        <input
          type="search"
          className={styles.input}
          placeholder="Search movies & TV shows…"
          aria-label="Search movies and TV shows"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </form>

      {showDropdown && (
        <div className={styles.dropdown}>
          {results.length === 0 && <p className={styles.hint}>{isFetching ? 'Searching…' : 'No matches found'}</p>}

          {results.map((media) => (
            <Link key={`${media.mediaType}-${media.id}`} to={paths.media(media.mediaType, media.id)} className={styles.result} onClick={handleSelect}>
              {media.posterPath ? (
                <img src={imageUrl(media.posterPath, 'w92')!} alt="" className={styles.thumb} loading="lazy" />
              ) : (
                <span className={styles.thumb} />
              )}
              <span className={styles.text}>
                <span className={styles.title}>{media.title}</span>
                <span className={styles.meta}>
                  {MEDIA_TYPE_LABELS[media.mediaType].singular}
                  {getYear(media.releaseDate) && ` · ${getYear(media.releaseDate)}`}
                </span>
              </span>
            </Link>
          ))}

          <button type="button" className={styles.viewAll} onClick={() => goToSearchPage()}>
            See all results for “{text.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
