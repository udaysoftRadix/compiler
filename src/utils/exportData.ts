function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Uint8Array) return `0x${Array.from(value, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  return String(value);
}

// RFC 4180 CSV. A leading BOM makes Excel read non-ASCII text as UTF-8.
export function toCsv(columns: string[], rows: unknown[][]): string {
  const escape = (field: string) => (/[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field);
  const lines = [columns, ...rows.map((row) => row.map(cellText))].map((line) => line.map(escape).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

// Array of objects. Duplicate column names (e.g. `SELECT a.id, b.id`) get a
// numeric suffix instead of silently overwriting each other.
export function toJson(columns: string[], rows: unknown[][]): string {
  const seen = new Map<string, number>();
  const keys = columns.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name}_${count}`;
  });

  const objects = rows.map((row) =>
    Object.fromEntries(keys.map((key, i) => [key, row[i] instanceof Uint8Array ? cellText(row[i]) : (row[i] ?? null)])),
  );
  return JSON.stringify(objects, null, 2);
}

export function downloadFile(filename: string, content: string | Uint8Array, mime: string) {
  const blob = new Blob([content as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
