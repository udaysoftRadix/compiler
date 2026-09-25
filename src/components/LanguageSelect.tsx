import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { LanguageDef } from '../data/languages';
import { IconCheck, IconChevronDown, IconSearch } from './icons';
import { LanguageIcon } from './LanguageIcon';
import './LanguageSelect.css';

interface LanguageSelectProps {
  languages: LanguageDef[];
  activeId?: string;
  isActiveMode: boolean;
  onSelect: (id: string) => void;
}

export function LanguageSelect({ languages, activeId, isActiveMode, onSelect }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const active = languages.find((l) => l.id === activeId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter((l) => l.label.toLowerCase().includes(q));
  }, [languages, query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const startIndex = Math.max(0, languages.findIndex((l) => l.id === activeId));
    setHighlighted(startIndex);
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${highlighted}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  function selectAt(index: number) {
    const lang = filtered[index];
    if (!lang) return;
    onSelect(lang.id);
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectAt(highlighted);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className={`lang-select ${isActiveMode ? 'active' : ''} ${open ? 'open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="lang-select-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {isActiveMode && active ? (
          <>
            <LanguageIcon id={active.id} size={14} />
            <span>{active.label}</span>
          </>
        ) : (
          <span>More languages…</span>
        )}
        <IconChevronDown size={13} className="lang-select-chevron" />
      </button>

      {open && (
        <div className="lang-select-menu" role="listbox">
          <div className="lang-select-search">
            <IconSearch size={13} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search languages…"
            />
          </div>
          <div className="lang-select-list" ref={listRef}>
            {filtered.length === 0 && <div className="lang-select-empty">No languages found</div>}
            {filtered.map((l, i) => (
              <button
                type="button"
                key={l.id}
                data-index={i}
                className={`lang-select-item ${i === highlighted ? 'highlighted' : ''} ${
                  isActiveMode && l.id === activeId ? 'selected' : ''
                }`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => selectAt(i)}
                role="option"
                aria-selected={isActiveMode && l.id === activeId}
              >
                <LanguageIcon id={l.id} size={16} />
                <span className="lang-select-label">{l.label}</span>
                {isActiveMode && l.id === activeId && <IconCheck size={13} className="lang-select-check" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
