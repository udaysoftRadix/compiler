import type { ReactNode } from 'react';

const KEYWORDS = new Set([
  'function', 'return', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
  'continue', 'class', 'new', 'try', 'catch', 'finally', 'throw', 'import', 'export', 'from', 'as', 'default',
  'async', 'await', 'yield', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete', 'this', 'super', 'extends',
  'implements', 'interface', 'type', 'enum', 'namespace', 'public', 'private', 'protected', 'static', 'readonly',
  'abstract', 'def', 'elif', 'except', 'with', 'lambda', 'pass', 'global', 'nonlocal', 'None', 'True', 'False',
  'self', 'print', 'fn', 'impl', 'match', 'mut', 'pub', 'struct', 'trait', 'use', 'mod', 'package', 'func', 'go',
  'defer', 'chan', 'select', 'range', 'int', 'float', 'double', 'string', 'bool', 'char', 'long', 'short',
  'unsigned', 'signed', 'null', 'nil', 'true', 'false', 'undefined', 'NaN', 'Infinity', 'end', 'then', 'begin',
  'module', 'done', 'elif', 'echo', 'foreach', 'until',
]);

// Not a full per-language tokenizer — a single generic pass (comments,
// strings, numbers, call-position identifiers, keywords) that looks
// reasonable across the many languages this compiler supports, without
// pulling in a per-language grammar library.
const TOKEN_RE =
  /(\/\/[^\n]*|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][A-Za-z0-9_$]*\b)(?=\s*\()|(\b[A-Za-z_$][A-Za-z0-9_$]*\b)/g;

export function highlightLine(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(line))) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const [full, comment, str, num, func, word] = match;
    if (comment) {
      nodes.push(
        <span className="tok-comment" key={key++}>
          {comment}
        </span>,
      );
    } else if (str) {
      nodes.push(
        <span className="tok-string" key={key++}>
          {str}
        </span>,
      );
    } else if (num) {
      nodes.push(
        <span className="tok-number" key={key++}>
          {num}
        </span>,
      );
    } else if (func) {
      nodes.push(
        <span className="tok-function" key={key++}>
          {func}
        </span>,
      );
    } else if (word && KEYWORDS.has(word)) {
      nodes.push(
        <span className="tok-keyword" key={key++}>
          {word}
        </span>,
      );
    } else {
      nodes.push(full);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
  return nodes;
}
