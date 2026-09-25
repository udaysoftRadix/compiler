// SQL isn't offered by Compiler Explorer, so it runs locally instead: SQLite
// compiled to WebAssembly (sql.js) inside a Web Worker. The worker is
// short-lived so it can be terminated to stop a runaway query (e.g. an
// unbounded recursive CTE); the database file is handed back after each run
// and passed into the next one, which is what makes changes persist.
import type { SqlWorkerMessage, SqlWorkerRequest } from './sqlWorker';
import type { TableInfo } from './sqlSeed';

export type SqlResult = Exclude<SqlWorkerMessage, { type: 'done' | 'snapshot' }>;

export interface SqlSnapshot {
  tables: TableInfo[];
  db: Uint8Array;
}

export interface SqlRunCallbacks {
  onResult: (result: SqlResult) => void;
  onSnapshot: (snapshot: SqlSnapshot) => void;
  onDone: (info: { elapsedMs: number; timedOut: boolean }) => void;
}

export interface SqlRunController {
  stop: () => void;
}

const HARD_TIMEOUT_MS = 10000;

export function runSql(source: string, db: Uint8Array | null, callbacks: SqlRunCallbacks): SqlRunController {
  const worker = new Worker(new URL('./sqlWorker.ts', import.meta.url), { type: 'module' });
  const startedAt = Date.now();
  let settled = false;

  function finish(timedOut: boolean) {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutHandle);
    worker.terminate();
    callbacks.onDone({ elapsedMs: Date.now() - startedAt, timedOut });
  }

  const timeoutHandle = setTimeout(() => {
    if (settled) return;
    callbacks.onResult({ type: 'error', message: `Execution stopped: exceeded ${HARD_TIMEOUT_MS / 1000}s time limit (possible infinite query).` });
    finish(true);
  }, HARD_TIMEOUT_MS);

  worker.addEventListener('message', (event: MessageEvent<SqlWorkerMessage>) => {
    if (settled) return;
    const msg = event.data;
    if (msg.type === 'done') finish(false);
    else if (msg.type === 'snapshot') callbacks.onSnapshot({ tables: msg.tables, db: msg.db });
    else callbacks.onResult(msg);
  });

  worker.addEventListener('error', (event) => {
    if (settled) return;
    callbacks.onResult({ type: 'error', message: event.message || 'Could not start the SQL engine.' });
    finish(false);
  });

  worker.postMessage({ source, db } satisfies SqlWorkerRequest);

  return { stop: () => finish(false) };
}
