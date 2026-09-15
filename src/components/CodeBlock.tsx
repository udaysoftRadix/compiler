import { useState } from 'react';
import { highlightLine } from '../ai/highlight';
import { extractFilename } from '../ai/codeMeta';

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
          <span className="code-block-file-icon" aria-hidden="true">
            📄
          </span>
          {label}
        </span>
        <button type="button" className="code-block-copy" onClick={handleCopy}>
          {copied ? '✓ Copied' : '⧉ Copy'}
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
