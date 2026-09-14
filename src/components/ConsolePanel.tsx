import type { ConsoleEntry } from '../types';

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function ConsolePanel({ entries, onClear, collapsed, onToggleCollapsed }: ConsolePanelProps) {
  return (
    <div className={`console-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="console-header" onClick={onToggleCollapsed}>
        <span>Console {entries.length > 0 && <span className="console-count">{entries.length}</span>}</span>
        <div className="console-header-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            Clear
          </button>
          <span className="console-collapse-icon">{collapsed ? '▲' : '▼'}</span>
        </div>
      </div>
      {!collapsed && (
        <div className="console-body">
          {entries.length === 0 && <div className="console-empty">No console output yet.</div>}
          {entries.map((entry) => (
            <div key={entry.id} className={`console-entry console-${entry.level}`}>
              {entry.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
