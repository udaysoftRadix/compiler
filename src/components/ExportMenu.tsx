import { useEffect, useRef, useState } from 'react';
import { IconChevronDown, IconDownload } from './icons';
import './ExportMenu.css';

export interface ExportItem {
  label: string;
  hint?: string;
  onSelect: () => void | Promise<void>;
}

interface ExportMenuProps {
  items: ExportItem[];
  label?: string;
  disabled?: boolean;
}

export function ExportMenu({ items, label = 'Export', disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function select(item: ExportItem) {
    setOpen(false);
    setBusy(true);
    try {
      await item.onSelect();
    } catch (err) {
      window.alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        type="button"
        className="export-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IconDownload size={12} />
        {busy ? 'Exporting…' : label}
        <IconChevronDown size={11} />
      </button>

      {open && (
        <div className="export-menu-list" role="menu">
          {items.map((item) => (
            <button type="button" role="menuitem" key={item.label} className="export-menu-item" onClick={() => select(item)}>
              <span>{item.label}</span>
              {item.hint && <span className="export-menu-hint">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
