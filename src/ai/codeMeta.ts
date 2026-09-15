const LANG_EXTENSIONS: Record<string, string> = {
  js: 'js', javascript: 'js', jsx: 'jsx',
  ts: 'ts', typescript: 'ts', tsx: 'tsx',
  py: 'py', python: 'py',
  java: 'java',
  c: 'c',
  cpp: 'cpp', 'c++': 'cpp', cc: 'cpp',
  cs: 'cs', csharp: 'cs',
  go: 'go', golang: 'go',
  rs: 'rs', rust: 'rs',
  rb: 'rb', ruby: 'rb',
  php: 'php',
  swift: 'swift',
  kt: 'kt', kotlin: 'kt',
  sql: 'sql',
  sh: 'sh', bash: 'sh', shell: 'sh',
  json: 'json',
  html: 'html',
  css: 'css',
  yaml: 'yml', yml: 'yml',
};

const FILENAME_COMMENT_RE = /^\s*(?:\/\/|#|--|;|%|')\s*filename\s*:\s*(.+?)\s*$/i;

export interface ExtractedCode {
  filename?: string;
  label: string;
  code: string;
}

export function extractFilename(rawCode: string, language?: string): ExtractedCode {
  const lines = rawCode.replace(/\n$/, '').split('\n');
  const firstLine = lines[0] ?? '';
  const match = firstLine.match(FILENAME_COMMENT_RE);

  if (match) {
    const rest = lines.slice(1);
    if (rest[0]?.trim() === '') rest.shift();
    return { filename: match[1], label: match[1], code: rest.join('\n') };
  }

  const lang = language?.toLowerCase().trim();
  const ext = lang ? LANG_EXTENSIONS[lang] : undefined;
  const filename = ext ? `solution.${ext}` : undefined;

  return { filename, label: filename ?? lang ?? 'code', code: lines.join('\n') };
}
