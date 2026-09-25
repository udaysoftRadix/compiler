import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { SQL_SEED, type TableInfo } from './sqlSeed';

export type SqlWorkerMessage =
  | { type: 'rows'; columns: string[]; rows: unknown[][]; totalRows: number }
  | { type: 'ok'; changes: number | null }
  | { type: 'error'; message: string }
  | { type: 'snapshot'; tables: TableInfo[]; db: Uint8Array }
  | { type: 'dump'; sql: string }
  | { type: 'done' };

export interface SqlWorkerRequest {
  source: string;
  // Database file from the previous run; absent means "start from the seed".
  db: Uint8Array | null;
  // 'dump' skips `source` and returns the whole database as portable SQL.
  mode?: 'run' | 'dump';
}

// The UI only renders the first few hundred rows, but keeps this many so a
// result can be exported in full.
const MAX_ROWS = 100000;
const PANEL_ROWS = 100;
const DML_RE = /^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)*(insert|update|delete|replace)\b/i;

function post(message: SqlWorkerMessage) {
  self.postMessage(message);
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function snapshotTables(db: Database): TableInfo[] {
  const names = (db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")[0]?.values ?? []).map((r) =>
    String(r[0]),
  );

  return names.map((name) => {
    const ident = quoteIdent(name);
    // PRAGMA table_info columns: cid, name, type, notnull, dflt_value, pk
    const columns = (db.exec(`PRAGMA table_info(${ident})`)[0]?.values ?? []).map((r) => ({
      name: String(r[1]),
      type: String(r[2] ?? '').toUpperCase() || 'ANY',
      primaryKey: Number(r[5]) > 0,
    }));
    const rows = db.exec(`SELECT * FROM ${ident} LIMIT ${PANEL_ROWS}`)[0]?.values ?? [];
    const totalRows = Number(db.exec(`SELECT count(*) FROM ${ident}`)[0]?.values[0]?.[0] ?? rows.length);
    return { name, columns, rows, totalRows };
  });
}

function sqlLiteralList(db: Database, table: string, columns: string[]): string[] {
  const ident = quoteIdent(table);
  const values = columns.map((c) => `quote(${quoteIdent(c)})`).join(` || ', ' || `);
  const result = db.exec(`SELECT ${values} FROM ${ident}`)[0];
  return (result?.values ?? []).map((row) => `INSERT INTO ${ident} VALUES (${row[0]});`);
}

function dumpDatabase(db: Database): string {
  const objects = db.exec("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY rowid")[0]?.values ?? [];
  const lines = ['-- Exported from Online Code Compiler (SQLite)', 'BEGIN TRANSACTION;'];

  // Tables first (with their rows), then indexes/views/triggers that depend on them.
  for (const [type, name, sql] of objects) {
    if (type !== 'table') continue;
    lines.push(`${sql};`);
    const columns = (db.exec(`PRAGMA table_info(${quoteIdent(String(name))})`)[0]?.values ?? []).map((r) => String(r[1]));
    if (columns.length > 0) lines.push(...sqlLiteralList(db, String(name), columns));
  }
  for (const [type, , sql] of objects) {
    if (type !== 'table') lines.push(`${sql};`);
  }

  lines.push('COMMIT;', '');
  return lines.join('\n');
}

self.onmessage = async (event: MessageEvent<SqlWorkerRequest>) => {
  try {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const db = new SQL.Database(event.data.db ?? undefined);
    try {
      if (!event.data.db) db.run(SQL_SEED);

      if (event.data.mode === 'dump') {
        post({ type: 'dump', sql: dumpDatabase(db) });
      } else {
        try {
          for (const stmt of db.iterateStatements(event.data.source)) {
            const columns = stmt.getColumnNames();
            if (columns.length > 0) {
              const rows: unknown[][] = [];
              let totalRows = 0;
              while (stmt.step()) {
                totalRows += 1;
                if (rows.length < MAX_ROWS) rows.push(stmt.get());
              }
              post({ type: 'rows', columns, rows, totalRows });
            } else {
              stmt.step();
              post({ type: 'ok', changes: DML_RE.test(stmt.getSQL()) ? db.getRowsModified() : null });
            }
          }
        } catch (err) {
          post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        }

        // Statements that ran before an error keep their effect, like a real
        // database in autocommit mode.
        post({ type: 'snapshot', tables: snapshotTables(db), db: db.export() });
      }
    } finally {
      db.close();
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
  post({ type: 'done' });
};
