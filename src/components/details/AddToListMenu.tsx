import { Check, ListPlus, Plus } from 'lucide-react';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useLibrary } from '@/context/LibraryContext';
import { useClickOutside } from '@/hooks/useClickOutside';
import type { MediaSummary } from '@/types/media';
import { mediaKey } from '@/utils/media';
import styles from './AddToListMenu.module.css';

/** Dropdown to add/remove a title from the user's custom lists, or create a new list. */
export function AddToListMenu({ media }: { media: MediaSummary }) {
  const { data, toggleListItem, createList } = useLibrary();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const key = mediaKey(media);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    createList(newName.trim());
    setNewName('');
  };

  return (
    <div ref={ref} className={styles.container}>
      <Button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
        <ListPlus size={17} /> Add to list
      </Button>

      {open && (
        <div className={styles.menu}>
          {data.lists.length === 0 && <p className={styles.hint}>You don’t have any lists yet.</p>}
          {data.lists.map((list) => {
            const included = list.items.some((item) => mediaKey(item) === key);
            return (
              <button key={list.id} type="button" className={styles.item} onClick={() => toggleListItem(list.id, media)} aria-pressed={included}>
                <span className={styles.check}>{included && <Check size={14} />}</span>
                {list.name}
                <span className={styles.count}>{list.items.length}</span>
              </button>
            );
          })}
          <form onSubmit={handleCreate} className={styles.form}>
            <input className="input" placeholder="New list name" value={newName} onChange={(event) => setNewName(event.target.value)} aria-label="New list name" />
            <Button type="submit" size="sm" variant="primary" aria-label="Create list" disabled={!newName.trim()}>
              <Plus size={16} />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
