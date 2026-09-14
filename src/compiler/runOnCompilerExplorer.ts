// Real compilers for two dozen-plus languages can't run client-side, so
// this sends code to Compiler Explorer's (https://godbolt.org) public,
// CORS-open, keyless execute API — the same kind of sandboxed-execution
// backend real online compilers use.
//
// (paiza.io was tried first and has a nicer language-name-based API, but it
// sends no Access-Control-Allow-Origin header, so browsers block it outright
// — it only "works" from curl/servers, never from client-side fetch.)
const ENDPOINT_BASE = 'https://godbolt.org/api/compiler';
const CLIENT_TIMEOUT_MS = 25000;

interface OutputLine {
  text: string;
  tag?: { text: string };
}

interface BuildResult {
  code: number;
  stderr?: OutputLine[];
  stdout?: OutputLine[];
}

interface CompileResponse {
  code: number;
  didExecute: boolean;
  timedOut: boolean;
  stdout?: OutputLine[];
  stderr?: OutputLine[];
  buildResult?: BuildResult;
}

export interface RunCallbacks {
  onConsole: (level: 'log' | 'warn' | 'error', text: string) => void;
  onDone: (info: { elapsedMs: number; timedOut: boolean }) => void;
}

export interface RunController {
  stop: () => void;
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function lineText(line: OutputLine): string {
  return stripAnsi(line.tag?.text ?? line.text);
}

export function runOnCompilerExplorer(compilerId: string, source: string, stdin: string, callbacks: RunCallbacks): RunController {
  const controller = new AbortController();
  const startedAt = Date.now();
  let settled = false;

  const abortTimer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  function finish(timedOut: boolean) {
    if (settled) return;
    settled = true;
    clearTimeout(abortTimer);
    callbacks.onDone({ elapsedMs: Date.now() - startedAt, timedOut });
  }

  function handleResult(data: CompileResponse) {
    const build = data.buildResult;

    if (build && build.code !== 0) {
      const messages = (build.stderr ?? []).map(lineText).join('\n').trim();
      callbacks.onConsole('error', `Compilation failed:\n${messages || 'Unknown compiler error'}`);
      finish(false);
      return;
    }

    for (const line of build?.stderr ?? []) {
      const text = lineText(line);
      if (text.trim()) callbacks.onConsole('warn', text);
    }

    for (const line of data.stdout ?? []) {
      callbacks.onConsole('log', line.text);
    }
    for (const line of data.stderr ?? []) {
      callbacks.onConsole('error', line.text);
    }

    if (data.timedOut) {
      callbacks.onConsole('error', 'Execution stopped: exceeded the compiler service time limit (possible infinite loop).');
      finish(true);
      return;
    }

    if (typeof data.code === 'number' && data.code !== 0) {
      callbacks.onConsole('warn', `Program exited with code ${data.code}`);
    }

    finish(false);
  }

  fetch(`${ENDPOINT_BASE}/${encodeURIComponent(compilerId)}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      source,
      options: {
        userArguments: '',
        executeParameters: { args: [], stdin },
        compilerOptions: { executorRequest: true },
        filters: { execute: true },
      },
    }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Compiler service returned HTTP ${res.status}`);
      return (await res.json()) as CompileResponse;
    })
    .then((data) => {
      if (settled) return;
      handleResult(data);
    })
    .catch((err: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(abortTimer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        callbacks.onConsole('error', 'Stopped.');
      } else {
        const message = err instanceof Error ? err.message : String(err);
        callbacks.onConsole('error', `Could not reach the compiler service: ${message}`);
      }
      callbacks.onDone({ elapsedMs: Date.now() - startedAt, timedOut: false });
    });

  return {
    stop: () => {
      if (settled) return;
      settled = true;
      clearTimeout(abortTimer);
      controller.abort();
      callbacks.onDone({ elapsedMs: Date.now() - startedAt, timedOut: false });
    },
  };
}
