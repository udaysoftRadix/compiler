// SQL isn't offered by Compiler Explorer, so it runs locally instead: SQLite
// compiled to WebAssembly (sql.js) inside a Web Worker. Each run starts from a
// fresh in-memory database, and the worker can be terminated to stop a runaway
// query (e.g. an unbounded recursive CTE).
import type { SqlWorkerMessage } from './sqlWorker';

export type SqlResult = Exclude<SqlWorkerMessage, { type: 'done' }>;

export interface SqlRunCallbacks {
  onResult: (result: SqlResult) => void;
  onDone: (info: { elapsedMs: number; timedOut: boolean }) => void;
}

export interface SqlRunController {
  stop: () => void;
}

const HARD_TIMEOUT_MS = 10000;

export function runSql(source: string, callbacks: SqlRunCallbacks): SqlRunController {
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
    else callbacks.onResult(msg);
  });

  worker.addEventListener('error', (event) => {
    if (settled) return;
    callbacks.onResult({ type: 'error', message: event.message || 'Could not start the SQL engine.' });
    finish(false);
  });

  worker.postMessage({ source });

  return { stop: () => finish(false) };
}
