/** Minimal CSV parser (handles quoted fields, commas/newlines inside quotes, and a BOM). */

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^﻿/, '');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }

  const [headerRow = [], ...dataRows] = records.filter((row) => row.some((cell) => cell.trim() !== ''));
  const headers = headerRow.map((header) => header.trim());
  const rows = dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()])));
  return { headers, rows };
}

/** Returns the first non-empty value among several possible column names. */
export function pickColumn(row: CsvRow, candidates: string[]): string {
  for (const name of candidates) {
    if (row[name]) return row[name];
  }
  return '';
}
