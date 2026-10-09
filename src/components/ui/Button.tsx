import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  active?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', active = false, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={[styles.button, styles[variant], styles[size], active && styles.active, className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
