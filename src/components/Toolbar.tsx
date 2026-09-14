import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { languages } from '../data/languages';
import type { Template } from '../types';

type CompilerMode = 'react' | 'js' | 'lang';

interface ToolbarProps {
  mode: CompilerMode;
  templates?: Template[];
  onLoadTemplate?: (templateId: string) => void;
  onReset: () => void;
  onShare: () => void;
  onDownload: () => void;
  compiling?: boolean;
  extraActions?: ReactNode;
  activeLanguageId?: string;
  activeLanguageLabel?: string;
  activeLanguageIcon?: string;
}

const FIXED_BRAND: Record<'react' | 'js', { icon: string; label: string }> = {
  react: { icon: '⚛', label: 'React Compiler' },
  js: { icon: '{ }', label: 'JS Compiler' },
};

export function Toolbar({
  mode,
  templates,
  onLoadTemplate,
  onReset,
  onShare,
  onDownload,
  compiling,
  extraActions,
  activeLanguageId,
  activeLanguageLabel,
  activeLanguageIcon,
}: ToolbarProps) {
  const navigate = useNavigate();
  const brand = mode === 'lang' ? { icon: activeLanguageIcon ?? '💻', label: `${activeLanguageLabel ?? 'Language'} Compiler` } : FIXED_BRAND[mode];

  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-logo">{brand.icon}</span>
        <span>{brand.label}</span>
        {compiling !== undefined && (
          <span className={`status-dot ${compiling ? 'compiling' : 'ready'}`} title={compiling ? 'Compiling…' : 'Up to date'} />
        )}
      </div>

      <nav className="toolbar-nav">
        <NavLink to="/react" className={({ isActive }) => `toolbar-nav-link ${isActive ? 'active' : ''}`}>
          React
        </NavLink>
        <NavLink to="/js" className={({ isActive }) => `toolbar-nav-link ${isActive ? 'active' : ''}`}>
          JavaScript
        </NavLink>
        <select
          className={`toolbar-nav-lang-select ${mode === 'lang' ? 'active' : ''}`}
          value={mode === 'lang' ? (activeLanguageId ?? '') : ''}
          onChange={(e) => e.target.value && navigate(`/compiler/${e.target.value}`)}
        >
          <option value="" disabled>
            {mode === 'lang' ? 'Switch language…' : 'More languages…'}
          </option>
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </nav>

      <div className="toolbar-actions">
        {extraActions}
        {templates && templates.length > 0 && (
          <select defaultValue="" onChange={(e) => e.target.value && onLoadTemplate?.(e.target.value)}>
            <option value="" disabled>
              Load template…
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        <button onClick={onDownload}>Download</button>
        <button onClick={onShare}>Share</button>
        <button onClick={onReset} className="danger">
          Reset
        </button>
      </div>
    </div>
  );
}
