import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Toolbar } from '../components/Toolbar';
import { EditorPane } from '../components/EditorPane';
import { InputPanel } from '../components/InputPanel';
import { OutputPanel } from '../components/OutputPanel';
import { runOnCompilerExplorer, type RunController } from '../compiler/runOnCompilerExplorer';
import { getLanguage, defaultLanguageId, type LanguageDef } from '../data/languages';
import { decodeFromHash, encodeToHash } from '../utils/share';
import type { ConsoleEntry } from '../types';
import '../App.css';

interface SharedPayload {
  code: string;
  input: string;
}

function loadInitial(lang: LanguageDef): SharedPayload {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    const fromHash = decodeFromHash<SharedPayload>(hash);
    if (fromHash && typeof fromHash.code === 'string') {
      return { code: fromHash.code, input: fromHash.input ?? '' };
    }
  }

  try {
    const storedCode = window.localStorage.getItem(`lang-compiler-${lang.id}-code-v1`);
    const storedInput = window.localStorage.getItem(`lang-compiler-${lang.id}-input-v1`);
    if (storedCode) {
      return { code: storedCode, input: storedInput ?? '' };
    }
  } catch {
    // ignore malformed storage
  }

  return { code: lang.template, input: '' };
}

export function CompilerPage() {
  const { language } = useParams<{ language: string }>();
  const lang = getLanguage(language);

  if (!lang) {
    return <Navigate to={`/compiler/${defaultLanguageId}`} replace />;
  }

  return <LanguageWorkspace key={lang.id} lang={lang} />;
}

function LanguageWorkspace({ lang }: { lang: LanguageDef }) {
  const initial = useRef(loadInitial(lang));
  const [code, setCode] = useState(initial.current.code);
  const [input, setInput] = useState(initial.current.input);
  const [output, setOutput] = useState<ConsoleEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'timeout'>('idle');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [splitPercent, setSplitPercent] = useState(55);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const runControllerRef = useRef<RunController | null>(null);
  const entryIdRef = useRef(0);

  const codeKey = `lang-compiler-${lang.id}-code-v1`;
  const inputKey = `lang-compiler-${lang.id}-input-v1`;

  useEffect(() => {
    window.localStorage.setItem(codeKey, code);
  }, [code, codeKey]);

  useEffect(() => {
    window.localStorage.setItem(inputKey, input);
  }, [input, inputKey]);

  useEffect(() => {
    return () => runControllerRef.current?.stop();
  }, []);

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
    setStatus('running');

    runControllerRef.current = runOnCompilerExplorer(lang.compilerId, code, input, {
      onConsole: (level, text) => appendOutput(level, text),
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

  function resetProject() {
    if (!window.confirm('Reset to the default Hello World? Unsaved changes will be lost.')) return;
    setCode(lang.template);
    setInput('');
    setOutput([]);
    setStatus('idle');
    window.location.hash = '';
  }

  async function shareProject() {
    const encoded = encodeToHash({ code, input } satisfies SharedPayload);
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
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lang.fileName;
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

  return (
    <div className="app-shell">
      <Toolbar
        mode="lang"
        activeLanguageId={lang.id}
        activeLanguageLabel={lang.label}
        activeLanguageIcon={lang.icon}
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
          <div className="file-tabs">
            <div className="file-tab active">
              <span className="entry-dot" />
              <span>{lang.fileName}</span>
            </div>
          </div>
          <div className="editor-container">
            <EditorPane file={{ name: lang.fileName, content: code }} onChange={setCode} onRun={handleRun} language={lang.monacoLanguage} />
          </div>
        </div>

        <div className="divider" onPointerDown={onDividerPointerDown} />

        <div className="pane io-column" style={{ width: `${100 - splitPercent}%` }}>
          <InputPanel value={input} onChange={setInput} placeholder={'Type input here, one value per line.\nThis is fed to your program as stdin.'} />
          <OutputPanel entries={output} status={status} elapsedMs={elapsedMs} onClear={() => setOutput([])} />
        </div>
      </div>
    </div>
  );
}
