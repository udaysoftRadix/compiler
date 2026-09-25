import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { SqlChange } from '../compiler/sqlAnalysis';
import { IconAlertTriangle } from './icons';
import './SqlConfirmDialog.css';

interface SqlConfirmDialogProps {
  changes: SqlChange[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function SqlConfirmDialog({ changes, onConfirm, onCancel }: SqlConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const destructive = changes.some((c) => c.destructive);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      // Keep focus inside the dialog: it only has two buttons.
      e.preventDefault();
      (document.activeElement === confirmRef.current ? cancelRef.current : confirmRef.current)?.focus();
    }
  }

  return (
    <div className="sql-confirm-backdrop" onMouseDown={onCancel}>
      <div
        className="sql-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sql-confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="sql-confirm-header">
          <span className={`sql-confirm-icon ${destructive ? 'danger' : ''}`}>
            <IconAlertTriangle size={20} />
          </span>
          <div>
            <h3 id="sql-confirm-title">{destructive ? 'Potential issue detected with your query' : 'This query changes data'}</h3>
            <p>Review what will happen before running it.</p>
          </div>
        </div>

        <ul className="sql-confirm-list">
          {changes.map((change, i) => (
            <li key={i} className={change.destructive ? 'danger' : ''}>
              <span className="sql-confirm-summary">{change.summary}</span>
              {change.warning && <span className="sql-confirm-warning">{change.warning}</span>}
            </li>
          ))}
        </ul>

        <p className="sql-confirm-note">The sample tables are restored on every run, so nothing here is permanent.</p>

        <div className="sql-confirm-actions">
          <button ref={cancelRef} type="button" className="sql-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" className={`sql-confirm-run ${destructive ? 'danger' : ''}`} onClick={onConfirm}>
            {destructive ? 'Run this query' : 'Run query'}
          </button>
        </div>
      </div>
    </div>
  );
}
