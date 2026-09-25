import { useEffect, useRef, useState } from 'react';
import { Toolbar } from '../components/Toolbar';
import { EditorPane } from '../components/EditorPane';
import { ResultTable } from '../components/ResultTable';
import { AiHelpWidget } from '../components/AiHelpWidget';
import { statusLabel } from '../utils/statusLabel';
import { IconPanelLeft, IconPanelRight, IconPlay, IconTable } from '../components/icons';
import { runSql, type SqlResult, type SqlRunController } from '../compiler/runSql';
import { SEED_SCHEMA_COMMENT, SEED_TABLES } from '../compiler/sqlSeed';
import type { LanguageDef } from '../data/languages';
import { decodeFromHash, encodeToHash } from '../utils/share';
import './SqlWorkspace.css';

interface SharedPayload {
  code: string;
  input: string;
}

function loadInitialCode(lang: LanguageDef, codeKey: string): string {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    const fromHash = decodeFromHash<SharedPayload>(hash);
    if (fromHash && typeof fromHash.code === 'string') return fromHash.code;
  }
  try {
    const stored = window.localStorage.getItem(codeKey);
    if (stored) return stored;
  } catch {
    // ignore unavailable storage
  }
  return lang.template;
}

function describeForAi(results: SqlResult[]): string {
  return results
    .map((r) => {
      if (r.type === 'error') return `[error] ${r.message}`;
      if (r.type === 'rows') return `[result] ${r.totalRows} row(s), columns: ${r.columns.join(', ')}`;
      return '[ok]';
    })
    .join('\n');
}

export function SqlWorkspace({ lang }: { lang: LanguageDef }) {
  const codeKey = `lang-compiler-${lang.id}-code-v1`;
  const [code, setCode] = useState(() => loadInitialCode(lang, codeKey));
  const [results, setResults] = useState<SqlResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'timeout'>('idle');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [showSchema, setShowSchema] = useState(() => window.innerWidth > 1000);
  const [showTables, setShowTables] = useState(() => window.innerWidth > 1000);
  const controllerRef = useRef<SqlRunController | null>(null);

  useEffect(() => {
    window.localStorage.setItem(codeKey, code);
  }, [code, codeKey]);

  useEffect(() => () => controllerRef.current?.stop(), []);

  function handleRun() {
    controllerRef.current?.stop();
    setResults([]);
    setElapsedMs(null);
    setStatus('running');
    controllerRef.current = runSql(code, {
      onResult: (result) => setResults((prev) => [...prev, result]),
      onDone: ({ elapsedMs: ms, timedOut }) => {
        setElapsedMs(ms);
        setStatus(timedOut ? 'timeout' : 'done');
        controllerRef.current = null;
      },
    });
  }

  function resetProject() {
    if (!window.confirm('Reset to the default query? Unsaved changes will be lost.')) return;
    setCode(lang.template);
    setResults([]);
    setStatus('idle');
    window.location.hash = '';
  }

  async function shareProject() {
    const encoded = encodeToHash({ code, input: '' } satisfies SharedPayload);
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
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = lang.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const running = status === 'running';

  return (
    <div className="app-shell">
      <Toolbar
        mode="lang"
        activeLanguageId={lang.id}
        activeLanguageLabel={lang.label}
        onReset={resetProject}
        onShare={shareProject}
        onDownload={downloadProject}
        extraActions={
          running ? (
            <button className="run-btn stop" onClick={() => controllerRef.current?.stop()}>
              ■ Stop
            </button>
          ) : (
            <button className="run-btn sql-run-btn" onClick={handleRun}>
              <IconPlay size={12} />
              Run SQL
            </button>
          )
        }
      />

      <div className="sql-workspace">
        {showSchema && (
          <aside className="sql-side sql-schema" aria-label="Database schema">
            {SEED_TABLES.map((table) => (
              <div className="sql-schema-table" key={table.name}>
                <div className="sql-schema-title">
                  <IconTable size={18} />
                  {table.name}
                </div>
                <ul>
                  {table.columns.map((col) => (
                    <li key={col.name}>
                      <span className="sql-col-name">{col.name}</span>
                      <span className="sql-col-type">[{col.type}]</span>
                      {col.primaryKey && <span className="sql-col-badge">PK</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>
        )}

        <div className="sql-main">
          <section className="sql-editor">
            <div className="sql-pane-header">
              <button
                className={`sql-toggle ${showSchema ? 'on' : ''}`}
                onClick={() => setShowSchema((v) => !v)}
                title={showSchema ? 'Hide schema' : 'Show schema'}
                aria-label={showSchema ? 'Hide schema' : 'Show schema'}
              >
                <IconPanelLeft size={15} />
              </button>
              <span className="sql-pane-title">Input</span>
              <button
                className={`sql-toggle ${showTables ? 'on' : ''}`}
                onClick={() => setShowTables((v) => !v)}
                title={showTables ? 'Hide tables' : 'Show tables'}
                aria-label={showTables ? 'Hide tables' : 'Show tables'}
              >
                <IconPanelRight size={15} />
              </button>
            </div>
            <div className="editor-container">
              <EditorPane file={{ name: lang.fileName, content: code }} onChange={setCode} onRun={handleRun} language={lang.monacoLanguage} />
            </div>
          </section>

          <section className="sql-output">
            <div className="sql-pane-header">
              <span className="sql-pane-title">
                Output
                <span className={`run-status run-status-${status}`}>{statusLabel(status, elapsedMs)}</span>
              </span>
              <button className="sql-clear" onClick={() => setResults([])}>
                Clear
              </button>
            </div>
            <div className="sql-output-body">
              {results.length === 0 && !running && <div className="sql-empty">Press Run SQL (or Ctrl+Enter) to execute your query.</div>}
              {results.map((result, i) => {
                if (result.type === 'rows') {
                  return (
                    <div className="sql-result" key={i}>
                      <ResultTable columns={result.columns} rows={result.rows} />
                      <div className="sql-result-meta">
                        {result.totalRows} row{result.totalRows === 1 ? '' : 's'}
                        {result.rows.length < result.totalRows && ` (showing first ${result.rows.length})`}
                      </div>
                    </div>
                  );
                }
                if (result.type === 'ok') {
                  return (
                    <div className="sql-message sql-message-ok" key={i}>
                      {result.changes ? `OK — ${result.changes} row${result.changes === 1 ? '' : 's'} affected` : 'OK'}
                    </div>
                  );
                }
                return (
                  <div className="sql-message sql-message-error" key={i}>
                    {result.message}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {showTables && (
          <aside className="sql-side sql-tables" aria-label="Available tables">
            <div className="sql-pane-header">
              <span className="sql-pane-title">Available Tables</span>
            </div>
            <div className="sql-tables-body">
              {SEED_TABLES.map((table) => (
                <div className="sql-data-table" key={table.name}>
                  <h4>{table.name}</h4>
                  <ResultTable columns={table.columns.map((c) => c.name)} rows={table.rows} />
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      <AiHelpWidget language={lang.label} code={`${SEED_SCHEMA_COMMENT}\n\n${code}`} consoleOutput={describeForAi(results.slice(-20))} />
    </div>
  );
}
