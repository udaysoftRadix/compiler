import { useState } from 'react';
import type { ProjectFile } from '../types';

interface FileTabsProps {
  files: ProjectFile[];
  activeFile: string;
  allowedExtensions: string[];
  onSelect: (name: string) => void;
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
  onSetEntry: (name: string) => void;
}

export function FileTabs({ files, activeFile, allowedExtensions, onSelect, onAdd, onDelete, onSetEntry }: FileTabsProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  function commitAdd() {
    const name = newName.trim();
    setAdding(false);
    setNewName('');
    if (!name) return;
    const extPattern = new RegExp(`\\.(${allowedExtensions.join('|')})$`);
    if (!extPattern.test(name)) {
      window.alert(`File name must end in one of: ${allowedExtensions.map((e) => `.${e}`).join(', ')}`);
      return;
    }
    if (files.some((f) => f.name === name)) {
      window.alert('A file with that name already exists.');
      return;
    }
    onAdd(name);
  }

  return (
    <div className="file-tabs">
      {files.map((file) => (
        <div
          key={file.name}
          className={`file-tab ${file.name === activeFile ? 'active' : ''}`}
          onClick={() => onSelect(file.name)}
          onDoubleClick={() => onSetEntry(file.name)}
          title={file.isEntry ? 'Entry file (double-click a file to change)' : 'Double-click to set as entry'}
        >
          {file.isEntry && <span className="entry-dot" />}
          <span>{file.name}</span>
          {files.length > 1 && (
            <button
              className="file-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.name);
              }}
              aria-label={`Delete ${file.name}`}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {adding ? (
        <input
          autoFocus
          className="file-tab-input"
          value={newName}
          placeholder={`newfile.${allowedExtensions[0]}`}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitAdd();
            if (e.key === 'Escape') {
              setAdding(false);
              setNewName('');
            }
          }}
        />
      ) : (
        <button className="file-tab-add" onClick={() => setAdding(true)} title="Add file">
          +
        </button>
      )}
    </div>
  );
}
