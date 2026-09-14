import { useEffect, useRef, useState } from 'react';
import { Toolbar } from '../components/Toolbar';
import { FileTabs } from '../components/FileTabs';
import { EditorPane } from '../components/EditorPane';
import { InputPanel } from '../components/InputPanel';
import { OutputPanel } from '../components/OutputPanel';
import { buildBundle } from '../compiler/buildBundle';
import { runJsInWorker, type RunController } from '../compiler/runJsInWorker';
import { jsTemplates, defaultJsTemplate } from '../data/jsTemplates';
import { decodeFromHash, encodeToHash } from '../utils/share';
import type { ConsoleEntry, ProjectFile } from '../types';
import '../App.css';

const FILES_KEY = 'js-compiler-files-v1';
const INPUT_KEY = 'js-compiler-input-v1';
const ALLOWED_EXTENSIONS = ['js', 'ts'];

interface SharedPayload {
  files: ProjectFile[];
  input: string;
}

function loadInitial(): SharedPayload {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    const fromHash = decodeFromHash<SharedPayload>(hash);
    if (fromHash && Array.isArray(fromHash.files) && fromHash.files.length > 0) {
      return { files: fromHash.files, input: fromHash.input ?? '' };
    }
  }

  try {
    const storedFiles = window.localStorage.getItem(FILES_KEY);
    const storedInput = window.localStorage.getItem(INPUT_KEY);
    if (storedFiles) {
      const parsed = JSON.parse(storedFiles);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { files: parsed, input: storedInput ?? '' };
      }
    }
  } catch {
    // ignore malformed storage
  }

  return { files: defaultJsTemplate.files.map((f) => ({ ...f })), input: '' };
}

function sanitizeName(fileName: string): string {
  const base = fileName.replace(/\.(js|ts)$/, '');
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '');
  return cleaned || 'helper';
}

export function JsCompilerPage() {
  const initial = useRef(loadInitial());
  const [files, setFiles] = useState<ProjectFile[]>(initial.current.files);
  const [activeFile, setActiveFile] = useState<string>(initial.current.files[0]?.name ?? '');
  const [input, setInput] = useState(initial.current.input);
  const [output, setOutput] = useState<ConsoleEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'timeout'>('idle');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [splitPercent, setSplitPercent] = useState(55);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const runControllerRef = useRef<RunController | null>(null);
  const entryIdRef = useRef(0);

  useEffect(() => {
    window.localStorage.setItem(FILES_KEY, JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    window.localStorage.setItem(INPUT_KEY, input);
  }, [input]);

  useEffect(() => {
    return () => runControllerRef.current?.stop();
  }, []);

  const current = files.find((f) => f.name === activeFile) ?? files[0];

  function nextId() {
    entryIdRef.current += 1;
    return `out-${entryIdRef.current}`;
  }

  function appendOutput(level: ConsoleEntry['level'], text: string) {
    setOutput((prev) => [...prev.slice(-499), { id: nextId(), level, text, timestamp: Date.now() }]);
  }

  function handleRun() {
    runControllerRef.current?.stop();
    setOutput([]);
    setElapsedMs(null);

    const bundle = buildBundle(files);
    if (bundle.error) {
      setStatus('done');
      appendOutput('error', `Failed to compile: ${bundle.error.file}\n${bundle.error.message}`);
      return;
    }

    setStatus('running');
    runControllerRef.current = runJsInWorker(bundle, input, {
      onConsole: (level, text) => appendOutput(level, text),
      onRuntimeError: (message) => appendOutput('error', message),
      onDone: ({ elapsedMs: ms, timedOut }) => {
        setElapsedMs(ms);
        setStatus(timedOut ? 'timeout' : 'done');
        runControllerRef.current = null;
      },
    });
  }

  function handleStop() {
    runControllerRef.current?.stop();
  }

  function updateFileContent(content: string) {
    setFiles((prev) => prev.map((f) => (f.name === activeFile ? { ...f, content } : f)));
  }

  function addFile(name: string) {
    setFiles((prev) => [...prev, { name, content: `export function ${sanitizeName(name)}() {\n\n}\n` }]);
    setActiveFile(name);
  }

  function deleteFile(name: string) {
    setFiles((prev) => {
      const next = prev.filter((f) => f.name !== name);
      if (prev.find((f) => f.name === name)?.isEntry && next.length > 0) {
        next[0] = { ...next[0], isEntry: true };
      }
      return next;
    });
    setActiveFile((prevActive) => (prevActive === name ? files.find((f) => f.name !== name)?.name ?? '' : prevActive));
  }

  function setEntry(name: string) {
    setFiles((prev) => prev.map((f) => ({ ...f, isEntry: f.name === name })));
  }

  function loadTemplate(templateId: string) {
    const template = jsTemplates.find((t) => t.id === templateId);
    if (!template) return;
    if (!window.confirm(`Load "${template.label}"? This will replace your current files.`)) return;
    setFiles(template.files.map((f) => ({ ...f })));
    setActiveFile(template.files.find((f) => f.isEntry)?.name ?? template.files[0].name);
    setInput('');
    setOutput([]);
    setStatus('idle');
  }

  function resetProject() {
    if (!window.confirm('Reset to the default template? Unsaved changes will be lost.')) return;
    setFiles(defaultJsTemplate.files.map((f) => ({ ...f })));
    setActiveFile(defaultJsTemplate.files.find((f) => f.isEntry)?.name ?? defaultJsTemplate.files[0].name);
    setInput('');
    setOutput([]);
    setStatus('idle');
    window.location.hash = '';
  }

  async function shareProject() {
    const encoded = encodeToHash({ files, input } satisfies SharedPayload);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    window.location.hash = encoded;
    try {
      await navigator.clipboard.writeText(url);
      window.alert('Shareable link copied to clipboard!');
    } catch {
      window.prompt('Copy this link to share your project:', url);
    }
  }

  function downloadProject() {
    const blob = new Blob([JSON.stringify({ files, input }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'js-compiler-project.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function onDividerPointerDown() {
    draggingRef.current = true;
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(80, Math.max(20, percent)));
    }
    function onUp() {
      draggingRef.current = false;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  if (!current) {
    return (
      <div className="empty-state">
        No files. <button onClick={resetProject}>Reset project</button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Toolbar
        mode="js"
        templates={jsTemplates}
        onLoadTemplate={loadTemplate}
        onReset={resetProject}
        onShare={shareProject}
        onDownload={downloadProject}
        extraActions={
          status === 'running' ? (
            <button className="run-btn stop" onClick={handleStop}>
              ■ Stop
            </button>
          ) : (
            <button className="run-btn" onClick={handleRun}>
              ▶ Run
            </button>
          )
        }
      />
      <div className="workspace" ref={containerRef}>
        <div className="pane editor-column" style={{ width: `${splitPercent}%` }}>
          <FileTabs
            files={files}
            activeFile={current.name}
            allowedExtensions={ALLOWED_EXTENSIONS}
            onSelect={setActiveFile}
            onAdd={addFile}
            onDelete={deleteFile}
            onSetEntry={setEntry}
          />
          <div className="editor-container">
            <EditorPane file={current} onChange={updateFileContent} onRun={handleRun} />
          </div>
        </div>

        <div className="divider" onPointerDown={onDividerPointerDown} />

        <div className="pane io-column" style={{ width: `${100 - splitPercent}%` }}>
          <InputPanel value={input} onChange={setInput} placeholder={'Type input here, one value per line.\nRead it in your code with readLine().'} />
          <OutputPanel entries={output} status={status} elapsedMs={elapsedMs} onClear={() => setOutput([])} />
        </div>
      </div>
    </div>
  );
}
