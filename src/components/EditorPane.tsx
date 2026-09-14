import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { ProjectFile } from '../types';

interface EditorPaneProps {
  file: ProjectFile;
  onChange: (content: string) => void;
  onRun?: () => void;
  language?: string;
}

function languageForFile(name: string): string {
  const ext = name.split('.').pop() ?? '';
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'typescript';
    case 'jsx':
    case 'js':
      return 'javascript';
    case 'css':
      return 'css';
    case 'c':
    case 'h':
      return 'c';
    default:
      return 'plaintext';
  }
}

export function EditorPane({ file, onChange, onRun, language }: EditorPaneProps) {
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
  };

  return (
    <Editor
      key={file.name}
      height="100%"
      language={language ?? languageForFile(file.name)}
      value={file.content}
      theme="vs-dark"
      onChange={(value) => onChange(value ?? '')}
      onMount={handleMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
      }}
    />
  );
}
