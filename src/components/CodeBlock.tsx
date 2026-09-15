import { useState } from 'react';
import { highlightLine } from '../ai/highlight';
import { extractFilename } from '../ai/codeMeta';
import { IconCheck, IconCopy, IconFileText } from './icons';

interface CodeBlockProps {
  language?: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { label, code: body } = extractFilename(code, language);
  const lines = body.split('\n');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable in this context; nothing to fall back to
    }
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-filename">
          <IconFileText size={12} className="code-block-file-icon" />
          {label}
        </span>
        <button type="button" className="code-block-copy" onClick={handleCopy}>
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-block-body">
        <code>
          {lines.map((line, i) => (
            <div className="code-line" key={i}>
              <span className="code-line-no">{i + 1}</span>
              <span className="code-line-content">{highlightLine(line)}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
