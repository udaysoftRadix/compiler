import type { Bundle } from './buildBundle';
import { jsWorkerRuntimeSource } from './jsWorkerRuntime';

export interface RunCallbacks {
  onConsole: (level: 'log' | 'info' | 'warn' | 'error', text: string) => void;
  onRuntimeError: (message: string) => void;
  onDone: (info: { elapsedMs: number; timedOut: boolean }) => void;
}

export interface RunController {
  stop: () => void;
}

const HARD_TIMEOUT_MS = 8000;

export function runJsInWorker(bundle: Bundle, stdin: string, callbacks: RunCallbacks): RunController {
  const blob = new Blob([jsWorkerRuntimeSource], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  const worker = new Worker(blobUrl);

  let settled = false;
  const startedAt = Date.now();

  const timeoutHandle = setTimeout(() => {
    if (settled) return;
    settled = true;
    callbacks.onRuntimeError(`Execution stopped: exceeded ${HARD_TIMEOUT_MS / 1000}s time limit (possible infinite loop).`);
    callbacks.onDone({ elapsedMs: Date.now() - startedAt, timedOut: true });
    cleanup();
  }, HARD_TIMEOUT_MS);

  function cleanup() {
    clearTimeout(timeoutHandle);
    worker.terminate();
    URL.revokeObjectURL(blobUrl);
  }

  worker.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'js-compiler-worker') return;

    if (data.type === 'ready') {
      worker.postMessage({ type: 'run', modules: bundle.modules, entry: bundle.entry, stdin });
      return;
    }

    if (data.type === 'console') {
      callbacks.onConsole(data.level, data.text);
      return;
    }

    if (data.type === 'runtime-error') {
      callbacks.onRuntimeError(data.message);
      return;
    }

    if (data.type === 'done') {
      if (settled) return;
      settled = true;
      callbacks.onDone({ elapsedMs: data.elapsedMs, timedOut: false });
      cleanup();
    }
  });

  worker.addEventListener('error', (event) => {
    if (settled) return;
    settled = true;
    callbacks.onRuntimeError(event.message || 'Worker error');
    callbacks.onDone({ elapsedMs: Date.now() - startedAt, timedOut: false });
    cleanup();
  });

  return {
    stop: () => {
      if (settled) return;
      settled = true;
      callbacks.onDone({ elapsedMs: Date.now() - startedAt, timedOut: false });
      cleanup();
    },
  };
}
