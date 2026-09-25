// SQL isn't offered by Compiler Explorer, so it runs locally instead: SQLite
// compiled to WebAssembly (sql.js) inside a Web Worker. Each run starts from a
// fresh in-memory database, and the worker can be terminated to stop a runaway
// query (e.g. an unbounded recursive CTE).
import type { SqlWorkerMessage } from './sqlWorker';
import type { RunCallbacks, RunController } from './runOnCompilerExplorer';

const HARD_TIMEOUT_MS = 10000;
const MAX_CELL_WIDTH = 60;

function formatCell(value: unknown): string {
  if (value === null) return 'NULL';
  if (value instanceof Uint8Array) return `<blob ${value.length} bytes>`;
  const text = String(value).replace(/\s*\n\s*/g, ' ');
  return text.length > MAX_CELL_WIDTH ? `${text.slice(0, MAX_CELL_WIDTH - 1)}…` : text;
}

function formatTable(columns: string[], rows: unknown[][], totalRows: number): string {
  const cells = rows.map((row) => row.map(formatCell));
  const widths = columns.map((name, i) => Math.max(name.length, ...cells.map((row) => row[i].length)));
  const line = (parts: string[]) => parts.map((part, i) => part.padEnd(widths[i])).join(' | ').trimEnd();

  const out = [line(columns), widths.map((w) => '-'.repeat(w)).join('-+-'), ...cells.map(line)];
  const shown = rows.length === totalRows ? '' : ` (showing first ${rows.length})`;
  out.push('', `${totalRows} row${totalRows === 1 ? '' : 's'}${shown}`);
  return out.join('\n');
}

export function runSql(source: string, callbacks: RunCallbacks): RunController {
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
    callbacks.onConsole('error', `Execution stopped: exceeded ${HARD_TIMEOUT_MS / 1000}s time limit (possible infinite query).`);
    finish(true);
  }, HARD_TIMEOUT_MS);

  worker.addEventListener('message', (event: MessageEvent<SqlWorkerMessage>) => {
    if (settled) return;
    const msg = event.data;
    if (msg.type === 'rows') {
      callbacks.onConsole('log', formatTable(msg.columns, msg.rows, msg.totalRows));
    } else if (msg.type === 'ok') {
      callbacks.onConsole('log', msg.changes ? `OK — ${msg.changes} row${msg.changes === 1 ? '' : 's'} affected` : 'OK');
    } else if (msg.type === 'error') {
      callbacks.onConsole('error', msg.message);
    } else if (msg.type === 'done') {
      finish(false);
    }
  });

  worker.addEventListener('error', (event) => {
    if (settled) return;
    callbacks.onConsole('error', event.message || 'Could not start the SQL engine.');
    finish(false);
  });

  worker.postMessage({ source });

  return { stop: () => finish(false) };
}
