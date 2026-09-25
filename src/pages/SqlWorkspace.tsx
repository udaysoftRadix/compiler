import { useEffect, useRef, useState } from 'react';
import { Toolbar } from '../components/Toolbar';
import { EditorPane } from '../components/EditorPane';
import { ResultTable } from '../components/ResultTable';
import { ExportMenu } from '../components/ExportMenu';
import { AiHelpWidget } from '../components/AiHelpWidget';
import { SqlConfirmDialog } from '../components/SqlConfirmDialog';
import { statusLabel } from '../utils/statusLabel';
import { downloadFile, toCsv, toJson } from '../utils/exportData';
import { IconPanelLeft, IconPanelRight, IconPlay, IconRotateCcw, IconTable } from '../components/icons';
import { exportDatabaseFile, exportSqlDump, runSql, type SqlResult, type SqlRunController } from '../compiler/runSql';
import { SEED_TABLE_INFO, describeSchema, type TableInfo } from '../compiler/sqlSeed';
import { analyzeSql, type SqlIssue } from '../compiler/sqlAnalysis';
import type { LanguageDef } from '../data/languages';
import { decodeFromHash, encodeToHash } from '../utils/share';
import { clearSqlState, loadSqlState, saveSqlState } from '../utils/sqlStorage';
import './SqlWorkspace.css';

// Result sets can hold far more rows than are worth rendering; the full set is
// still kept so it can be exported.
const DISPLAY_ROWS = 500;

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
  const [pendingIssues, setPendingIssues] = useState<SqlIssue[] | null>(null);
  // null until the saved database has been read from IndexedDB.
  const [tables, setTables] = useState<TableInfo[] | null>(null);
  const dbRef = useRef<Uint8Array | null>(null);
  const controllerRef = useRef<SqlRunController | null>(null);

  useEffect(() => {
    window.localStorage.setItem(codeKey, code);
  }, [code, codeKey]);

  useEffect(() => () => controllerRef.current?.stop(), []);

  useEffect(() => {
    let cancelled = false;
    loadSqlState().then((saved) => {
      if (cancelled) return;
      dbRef.current = saved?.db ?? null;
      setTables(saved?.tables ?? SEED_TABLE_INFO);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleRun() {
    if (pendingIssues || tables === null) return;
    const issues = analyzeSql(code);
    if (issues.length > 0) setPendingIssues(issues);
    else executeRun();
  }

  function executeRun() {
    setPendingIssues(null);
    controllerRef.current?.stop();
    setResults([]);
    setElapsedMs(null);
    setStatus('running');
    controllerRef.current = runSql(code, dbRef.current, {
      onResult: (result) => setResults((prev) => [...prev, result]),
      onSnapshot: ({ tables: next, db }) => {
        dbRef.current = db;
        setTables(next);
        void saveSqlState({ db, tables: next });
      },
      onDone: ({ elapsedMs: ms, timedOut }) => {
        setElapsedMs(ms);
        setStatus(timedOut ? 'timeout' : 'done');
        controllerRef.current = null;
      },
    });
  }

  function resetData() {
    dbRef.current = null;
    setTables(SEED_TABLE_INFO);
    void clearSqlState();
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
            <button className="run-btn sql-run-btn" onClick={handleRun} disabled={tables === null}>
              <IconPlay size={12} />
              Run SQL
            </button>
          )
        }
      />

      <div className="sql-workspace">
        {showSchema && (
          <aside className="sql-side sql-schema" aria-label="Database schema">
            {(tables ?? []).map((table) => (
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
                  const label = results.filter((r) => r.type === 'rows').length > 1 ? `result-${results.slice(0, i + 1).filter((r) => r.type === 'rows').length}` : 'query-result';
                  return (
                    <div className="sql-result" key={i}>
                      <div className="sql-result-head">
                        <span className="sql-result-meta">
                          {result.totalRows} row{result.totalRows === 1 ? '' : 's'}
                          {result.rows.length > DISPLAY_ROWS && ` (showing first ${DISPLAY_ROWS})`}
                          {result.totalRows > result.rows.length && ` (export limited to first ${result.rows.length.toLocaleString()})`}
                        </span>
                        <ExportMenu
                          items={[
                            { label: 'CSV', hint: '.csv', onSelect: () => downloadFile(`${label}.csv`, toCsv(result.columns, result.rows), 'text/csv;charset=utf-8') },
                            { label: 'JSON', hint: '.json', onSelect: () => downloadFile(`${label}.json`, toJson(result.columns, result.rows), 'application/json') },
                          ]}
                        />
                      </div>
                      <ResultTable columns={result.columns} rows={result.rows.slice(0, DISPLAY_ROWS)} />
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
              <div className="sql-pane-actions">
                <ExportMenu
                  disabled={running || tables === null}
                  items={[
                    {
                      label: 'Database file',
                      hint: '.sqlite',
                      onSelect: async () => downloadFile('database.sqlite', await exportDatabaseFile(dbRef.current), 'application/vnd.sqlite3'),
                    },
                    {
                      label: 'SQL dump',
                      hint: '.sql',
                      onSelect: async () => downloadFile('database.sql', await exportSqlDump(dbRef.current), 'application/sql'),
                    },
                  ]}
                />
                <button className="sql-clear sql-reset" onClick={resetData} disabled={running} title="Restore the original sample tables">
                  <IconRotateCcw size={12} />
                  Reset data
                </button>
              </div>
            </div>
            <div className="sql-tables-body">
              {tables?.length === 0 && <div className="sql-empty">The database has no tables.</div>}
              {(tables ?? []).map((table) => (
                <div className="sql-data-table" key={table.name}>
                  <h4>{table.name}</h4>
                  <ResultTable columns={table.columns.map((c) => c.name)} rows={table.rows} />
                  {table.totalRows > table.rows.length && (
                    <div className="sql-result-meta">
                      Showing first {table.rows.length} of {table.totalRows} rows
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {pendingIssues && <SqlConfirmDialog issues={pendingIssues} onConfirm={executeRun} onCancel={() => setPendingIssues(null)} />}

      <AiHelpWidget language={lang.label} code={`${describeSchema(tables ?? [])}\n\n${code}`} consoleOutput={describeForAi(results.slice(-20))} />
    </div>
  );
}
