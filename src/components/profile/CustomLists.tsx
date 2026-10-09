import { ListPlus, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { MediaRow } from '@/components/media/MediaRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { useLibrary } from '@/context/LibraryContext';
import type { CustomList } from '@/types/user';
import { pluralize } from '@/utils/format';
import sectionStyles from './ProfileSection.module.css';
import styles from './CustomLists.module.css';

/** Each list is one scrolling row; show a few lists per page. */
const LISTS_PER_PAGE = 3;

export function CustomLists({ lists }: { lists: CustomList[] }) {
  const { createList, deleteList } = useLibrary();
  const [name, setName] = useState('');
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(lists.length / LISTS_PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const visibleLists = lists.slice(current * LISTS_PER_PAGE, (current + 1) * LISTS_PER_PAGE);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createList(name.trim());
    setName('');
    // New lists are added at the end — jump there so you can see it.
    setPage(Math.floor(lists.length / LISTS_PER_PAGE));
  };

  const handleDelete = (list: CustomList) => {
    if (window.confirm(`Delete the list “${list.name}”?`)) deleteList(list.id);
  };

  return (
    <section className={sectionStyles.section}>
      <div className={sectionStyles.header}>
        <h2 className={sectionStyles.heading}>My Lists</h2>
        <form onSubmit={handleCreate} className={styles.form}>
          <input className="input" placeholder="New list name…" value={name} onChange={(event) => setName(event.target.value)} aria-label="New list name" />
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            <Plus size={17} /> Create
          </Button>
        </form>
      </div>

      {lists.length === 0 ? (
        <EmptyState icon={ListPlus} title="No lists yet" description="Create lists like “Date night” or “Best of 2026”, then add titles from any movie or show page." />
      ) : (
        visibleLists.map((list) => (
          <MediaRow
            key={list.id}
            title={list.name}
            subtitle={pluralize(list.items.length, 'title')}
            items={list.items}
            empty={<p className={styles.emptyList}>This list is empty — use “Add to list” on any title.</p>}
            actions={
              <Button variant="ghost" size="sm" onClick={() => handleDelete(list)} aria-label={`Delete list ${list.name}`}>
                <Trash2 size={16} />
              </Button>
            }
          />
        ))
      )}
      <Pagination page={current} pageCount={pageCount} onChange={setPage} label="List pages" />
    </section>
  );
}
