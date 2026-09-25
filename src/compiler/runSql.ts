// SQL isn't offered by Compiler Explorer, so it runs locally instead: SQLite
// compiled to WebAssembly (sql.js) inside a Web Worker. The worker is
// short-lived so it can be terminated to stop a runaway query (e.g. an
// unbounded recursive CTE); the database file is handed back after each run
// and passed into the next one, which is what makes changes persist.
import type { SqlWorkerMessage, SqlWorkerRequest } from './sqlWorker';
import type { TableInfo } from './sqlSeed';

export type SqlResult = Exclude<SqlWorkerMessage, { type: 'done' | 'snapshot' | 'dump' }>;

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
    else if (msg.type === 'dump') return;
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

// One-shot helper for export: runs the worker once and resolves with whatever
// `pick` extracts from its messages.
function withWorker<T>(request: SqlWorkerRequest, pick: (msg: SqlWorkerMessage) => T | undefined): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./sqlWorker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => fail(new Error('Export timed out')), HARD_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const fail = (err: Error) => {
      cleanup();
      reject(err);
    };

    worker.addEventListener('message', (event: MessageEvent<SqlWorkerMessage>) => {
      const value = pick(event.data);
      if (value !== undefined) {
        cleanup();
        resolve(value);
      } else if (event.data.type === 'error') {
        fail(new Error(event.data.message));
      }
    });
    worker.addEventListener('error', (event) => fail(new Error(event.message || 'Could not start the SQL engine.')));
    worker.postMessage(request);
  });
}

// The whole database as portable SQL (CREATE TABLE + INSERT statements).
export function exportSqlDump(db: Uint8Array | null): Promise<string> {
  return withWorker({ source: '', db, mode: 'dump' }, (msg) => (msg.type === 'dump' ? msg.sql : undefined));
}

// The SQLite database file. Before the first run there is no file yet, so an
// empty run is used to build the seeded one.
export function exportDatabaseFile(db: Uint8Array | null): Promise<Uint8Array> {
  if (db) return Promise.resolve(db);
  return withWorker({ source: '', db: null }, (msg) => (msg.type === 'snapshot' ? msg.db : undefined));
}
