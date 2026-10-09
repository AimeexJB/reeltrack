/** Backup files: a JSON snapshot of everything you've tracked, which can be imported again later. */

import type { UserData } from '@/types/user';
import { todayIso } from '@/utils/date';
import { downloadFile } from '@/utils/download';

const FORMAT = 'reeltrack-backup';
const VERSION = 1;

interface BackupFile {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  data: UserData;
}

export function exportBackup(data: UserData): void {
  const backup: BackupFile = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), data };
  downloadFile(`reeltrack-backup-${todayIso()}.json`, JSON.stringify(backup, null, 2));
}

export async function readBackup(file: File): Promise<UserData> {
  let parsed: Partial<BackupFile>;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  const data = parsed.data;
  if (parsed.format !== FORMAT || !data || typeof data.library !== 'object' || !Array.isArray(data.watches) || !Array.isArray(data.lists)) {
    throw new Error('That doesn’t look like a Reeltrack backup file.');
  }
  return data;
}
