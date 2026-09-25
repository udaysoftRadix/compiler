import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { SqlIssue } from '../compiler/sqlAnalysis';
import { IconX } from './icons';
import './SqlConfirmDialog.css';

interface SqlConfirmDialogProps {
  issues: SqlIssue[];
  onConfirm: () => void;
  onCancel: () => void;
}

function WarningBadge() {
  return (
    <span className="sql-confirm-badge" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M12 9v4M12 17h.01" fill="none" stroke="var(--badge-bg)" strokeWidth="2.4" />
      </svg>
    </span>
  );
}

export function SqlConfirmDialog({ issues, onConfirm, onCancel }: SqlConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;

    // Keep keyboard focus inside the dialog.
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button') ?? []);
    if (focusable.length === 0) return;
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (index <= 0 ? focusable.length - 1 : index - 1) : (index + 1) % focusable.length;
    e.preventDefault();
    focusable[next].focus();
  }

  return (
    <div className="sql-confirm-backdrop" onMouseDown={onCancel}>
      <div
        ref={dialogRef}
        className="sql-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sql-confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="sql-confirm-header">
          <h3 id="sql-confirm-title">Potential issue detected with your query</h3>
          <button type="button" className="sql-confirm-close" onClick={onCancel} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>

        <div className="sql-confirm-banner">
          <WarningBadge />
          <div>
            <p className="sql-confirm-banner-title">The following potential {issues.length === 1 ? 'issue has' : 'issues have'} been detected:</p>
            <p className="sql-confirm-banner-text">Ensure that these are intentional before executing this query</p>
          </div>
        </div>

        <div className="sql-confirm-body">
          {issues.map((issue) => (
            <div className="sql-confirm-card" key={issue.id}>
              <p className="sql-confirm-card-title">{issue.title}</p>
              <p className="sql-confirm-card-text">{issue.description}</p>
            </div>
          ))}
        </div>

        <div className="sql-confirm-footer">
          <button type="button" className="sql-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" className="sql-confirm-run" onClick={onConfirm}>
            Run this query
          </button>
        </div>
      </div>
    </div>
  );
}
