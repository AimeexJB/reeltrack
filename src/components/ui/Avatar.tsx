import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  src: string | null;
  size?: number;
}

const COLORS = ['#7c5cff', '#ff8a4d', '#2ecc8f', '#4da3ff', '#ff5c7a', '#f5b942'];

function colorFor(name: string): string {
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

/** Round profile picture, falling back to coloured initials. */
export function Avatar({ name, src, size = 40 }: AvatarProps) {
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (src) return <img src={src} alt={name} className={styles.avatar} style={style} />;

  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className={styles.avatar} style={{ ...style, background: colorFor(name) }} aria-label={name}>
      {initials}
    </span>
  );
}
