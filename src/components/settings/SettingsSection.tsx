import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './Settings.module.css';

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children: ReactNode;
}

export function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>
          <Icon size={20} />
        </span>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <div className={styles.sectionDescription}>{description}</div>
        </div>
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}
