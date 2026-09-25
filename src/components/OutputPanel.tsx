import type { ConsoleEntry } from '../types';
import { statusLabel } from '../utils/statusLabel';

interface OutputPanelProps {
  entries: ConsoleEntry[];
  status: 'idle' | 'running' | 'done' | 'timeout';
  elapsedMs: number | null;
  onClear: () => void;
}

export function OutputPanel({ entries, status, elapsedMs, onClear }: OutputPanelProps) {
  return (
    <div className="io-panel output-panel">
      <div className="io-panel-header">
        <span>
          Output
          <span className={`run-status run-status-${status}`}>{statusLabel(status, elapsedMs)}</span>
        </span>
        <button onClick={onClear}>Clear</button>
      </div>
      <div className="output-body">
        {entries.length === 0 && <div className="console-empty">Press Run (or Ctrl+Enter) to execute your code.</div>}
        {entries.map((entry) => (
          <div key={entry.id} className={`console-entry console-${entry.level}`}>
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
