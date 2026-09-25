import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { SQL_SEED } from './sqlSeed';

export type SqlWorkerMessage =
  | { type: 'rows'; columns: string[]; rows: unknown[][]; totalRows: number }
  | { type: 'ok'; changes: number | null }
  | { type: 'error'; message: string }
  | { type: 'done' };

const MAX_ROWS = 500;
const DML_RE = /^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)*(insert|update|delete|replace)\b/i;

function post(message: SqlWorkerMessage) {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<{ source: string }>) => {
  try {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const db = new SQL.Database();
    try {
      db.run(SQL_SEED);
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
    } finally {
      db.close();
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
  post({ type: 'done' });
};
