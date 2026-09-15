import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toolbar } from '../components/Toolbar';
import { FileTabs } from '../components/FileTabs';
import { EditorPane } from '../components/EditorPane';
import { PreviewPane } from '../components/PreviewPane';
import { ConsolePanel } from '../components/ConsolePanel';
import { AiHelpWidget } from '../components/AiHelpWidget';
import { buildBundle } from '../compiler/buildBundle';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { decodeFilesFromHash, encodeFilesToHash } from '../utils/share';
import type { ConsoleEntry, ProjectFile, Template } from '../types';
import '../App.css';

interface CompilerWorkspaceProps {
  mode: 'react' | 'js';
  templates: Template[];
  defaultTemplate: Template;
  storageKey: string;
  allowedExtensions: string[];
}

function loadInitialFiles(storageKey: string, defaultTemplate: Template): ProjectFile[] {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    const fromHash = decodeFilesFromHash(hash);
    if (fromHash && fromHash.length > 0) return fromHash;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore malformed storage
  }

  return defaultTemplate.files;
}

function sanitizeComponentName(fileName: string): string {
  const base = fileName.replace(/\.(jsx|tsx|js|ts|css)$/, '');
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned || !/^[a-zA-Z_]/.test(cleaned)) return 'Component';
  return cleaned[0].toUpperCase() + cleaned.slice(1);
}

export function CompilerWorkspace({ mode, templates, defaultTemplate, storageKey, allowedExtensions }: CompilerWorkspaceProps) {
  const [files, setFiles] = useState<ProjectFile[]>(() => loadInitialFiles(storageKey, defaultTemplate));
  const [activeFile, setActiveFile] = useState<string>(() => files[0]?.name ?? '');
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [splitPercent, setSplitPercent] = useState(48);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedFiles = useDebouncedValue(files, 350);
  const compiling = debouncedFiles !== files;
  const bundle = useMemo(() => buildBundle(debouncedFiles), [debouncedFiles]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(files));
  }, [files, storageKey]);

  const current = files.find((f) => f.name === activeFile) ?? files[0];

  function updateFileContent(content: string) {
    setFiles((prev) => prev.map((f) => (f.name === activeFile ? { ...f, content } : f)));
  }

  function addFile(name: string) {
    const isCss = name.endsWith('.css');
    const isReactComponentFile = mode === 'react' && (name.endsWith('.jsx') || name.endsWith('.tsx'));
    const content = isCss
      ? ''
      : isReactComponentFile
        ? `export default function ${sanitizeComponentName(name)}() {\n  return <div>New component</div>;\n}\n`
        : `export function ${sanitizeComponentName(name).toLowerCase()}() {\n\n}\n`;

    setFiles((prev) => [...prev, { name, content }]);
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
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    if (!window.confirm(`Load "${template.label}"? This will replace your current files.`)) return;
    setFiles(template.files.map((f) => ({ ...f })));
    setActiveFile(template.files.find((f) => f.isEntry)?.name ?? template.files[0].name);
    setConsoleEntries([]);
    setRefreshKey((k) => k + 1);
  }

  function resetProject() {
    if (!window.confirm('Reset to the default template? Unsaved changes will be lost.')) return;
    setFiles(defaultTemplate.files.map((f) => ({ ...f })));
    setActiveFile(defaultTemplate.files.find((f) => f.isEntry)?.name ?? defaultTemplate.files[0].name);
    setConsoleEntries([]);
    setRefreshKey((k) => k + 1);
    window.location.hash = '';
  }

  async function shareProject() {
    const encoded = encodeFilesToHash(files);
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
    const blob = new Blob([JSON.stringify({ files }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}-compiler-project.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleConsoleEntry = useCallback((entry: ConsoleEntry) => {
    setConsoleEntries((prev) => [...prev.slice(-199), entry]);
  }, []);

  const handleRuntimeError = useCallback((message: string) => {
    setConsoleEntries((prev) => [...prev.slice(-199), { id: `err-${Date.now()}`, level: 'error', text: message, timestamp: Date.now() }]);
  }, []);

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
        mode={mode}
        templates={templates}
        onLoadTemplate={loadTemplate}
        onReset={resetProject}
        onShare={shareProject}
        onDownload={downloadProject}
        compiling={compiling}
      />
      <div className="workspace" ref={containerRef}>
        <div className="pane editor-column" style={{ width: `${splitPercent}%` }}>
          <FileTabs
            files={files}
            activeFile={current.name}
            allowedExtensions={allowedExtensions}
            onSelect={setActiveFile}
            onAdd={addFile}
            onDelete={deleteFile}
            onSetEntry={setEntry}
          />
          <div className="editor-container">
            <EditorPane file={current} onChange={updateFileContent} />
          </div>
        </div>

        <div className="divider" onPointerDown={onDividerPointerDown} />

        <div className="pane preview-column" style={{ width: `${100 - splitPercent}%` }}>
          <div className="preview-header">
            <span>Preview</span>
            <button onClick={() => setRefreshKey((k) => k + 1)} title="Restart preview">
              ↻ Restart
            </button>
          </div>
          <div className="preview-container">
            <PreviewPane
              bundle={bundle}
              refreshKey={refreshKey}
              reactMode={mode === 'react'}
              onConsoleEntry={handleConsoleEntry}
              onRuntimeError={handleRuntimeError}
            />
            {bundle.error && (
              <div className="compile-error-overlay">
                <strong>Failed to compile: {bundle.error.file}</strong>
                <pre>{bundle.error.message}</pre>
              </div>
            )}
          </div>
          <ConsolePanel
            entries={consoleEntries}
            onClear={() => setConsoleEntries([])}
            collapsed={consoleCollapsed}
            onToggleCollapsed={() => setConsoleCollapsed((c) => !c)}
          />
        </div>
      </div>

      <AiHelpWidget
        language={mode === 'react' ? 'React (JSX/TSX)' : 'JavaScript'}
        code={files.map((f) => `// ${f.name}\n${f.content}`).join('\n\n')}
        consoleOutput={consoleEntries
          .slice(-20)
          .map((e) => `[${e.level}] ${e.text}`)
          .join('\n')}
      />
    </div>
  );
}
