import { useCallback, useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import type { ImportResult, ProgressCallback } from '@/types/import';
import { pluralize } from '@/utils/format';

export type ImportPhase =
  | { step: 'idle' }
  | { step: 'working'; done: number; total: number }
  | { step: 'preview'; result: ImportResult }
  | { step: 'saving' }
  | { step: 'done'; message: string }
  | { step: 'error'; message: string };

/**
 * Shared steps for every importer: read & match → preview → confirm & save.
 * Nothing is added to your library until you press Import on the preview.
 */
export function useImportFlow() {
  const { importItems } = useLibrary();
  const [phase, setPhase] = useState<ImportPhase>({ step: 'idle' });

  const run = useCallback(async (task: (onProgress: ProgressCallback) => Promise<ImportResult>) => {
    setPhase({ step: 'working', done: 0, total: 0 });
    try {
      const result = await task((done, total) => setPhase({ step: 'working', done, total }));
      setPhase({ step: 'preview', result });
    } catch (error) {
      setPhase({ step: 'error', message: error instanceof Error ? error.message : 'Import failed.' });
    }
  }, []);

  const confirm = useCallback(
    async (result: ImportResult) => {
      setPhase({ step: 'saving' });
      try {
        const added = await importItems(result.items, result.source);
        setPhase({ step: 'done', message: `Imported ${pluralize(result.items.length, 'title')} and ${pluralize(added, 'new viewing')}.` });
      } catch (error) {
        setPhase({ step: 'error', message: error instanceof Error ? error.message : 'Saving failed.' });
      }
    },
    [importItems],
  );

  const reset = useCallback(() => setPhase({ step: 'idle' }), []);

  return { phase, run, confirm, reset };
}
