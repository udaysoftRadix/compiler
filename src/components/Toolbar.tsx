import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { Template } from '../types';

type CompilerMode = 'react' | 'js' | 'c';

interface ToolbarProps {
  mode: CompilerMode;
  templates: Template[];
  onLoadTemplate: (templateId: string) => void;
  onReset: () => void;
  onShare: () => void;
  onDownload: () => void;
  compiling?: boolean;
  extraActions?: ReactNode;
}

const BRAND: Record<CompilerMode, { icon: string; label: string }> = {
  react: { icon: '⚛', label: 'React Compiler' },
  js: { icon: '{ }', label: 'JS Compiler' },
  c: { icon: 'C', label: 'C Compiler' },
};

export function Toolbar({ mode, templates, onLoadTemplate, onReset, onShare, onDownload, compiling, extraActions }: ToolbarProps) {
  const brand = BRAND[mode];

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
        <NavLink to="/c" className={({ isActive }) => `toolbar-nav-link ${isActive ? 'active' : ''}`}>
          C
        </NavLink>
      </nav>

      <div className="toolbar-actions">
        {extraActions}
        <select defaultValue="" onChange={(e) => e.target.value && onLoadTemplate(e.target.value)}>
          <option value="" disabled>
            Load template…
          </option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button onClick={onDownload}>Download</button>
        <button onClick={onShare}>Share</button>
        <button onClick={onReset} className="danger">
          Reset
        </button>
      </div>
    </div>
  );
}
