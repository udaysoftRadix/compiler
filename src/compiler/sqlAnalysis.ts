// Best-effort static scan of a SQL script for statements that change data or
// schema, used to ask for confirmation before running. It is a heuristic (not a
// SQL parser): comments and string literals are blanked out first so text
// like 'delete' never triggers it, then each statement is classified by its
// leading keyword.
export type SqlChangeKind = 'insert' | 'update' | 'delete' | 'drop' | 'alter';

export interface SqlChange {
  kind: SqlChangeKind;
  summary: string;
  destructive: boolean;
  warning?: string;
}

function stripNoise(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/'(?:[^']|'')*'?/g, "''")
    .replace(/"([^"]*)"|`([^`]*)`|\[([^\]]*)\]/g, (_, a, b, c) => (a ?? b ?? c ?? '').replace(/\W+/g, '_'));
}

function tableOf(statement: string, pattern: RegExp): string {
  return statement.match(pattern)?.[1] ?? 'a table';
}

function classify(statement: string): SqlChange | null {
  let text = statement;
  let first = text.match(/^\s*(\w+)/)?.[1]?.toLowerCase();
  if (!first) return null;

  // WITH ... INSERT/UPDATE/DELETE: classify by the data-changing verb.
  if (first === 'with') {
    const verb = text.match(/\b(insert|replace|update|delete)\b/i);
    if (!verb) return null;
    text = text.slice(verb.index);
    first = verb[1].toLowerCase();
  }

  const noWhere = !/\bwhere\b/i.test(text);

  switch (first) {
    case 'insert':
    case 'replace': {
      const table = tableOf(text, /\binto\s+([\w.]+)/i);
      return { kind: 'insert', summary: `Adds rows to ${table}`, destructive: false };
    }
    case 'update': {
      const table = tableOf(text, /^\s*update\s+(?:or\s+\w+\s+)?([\w.]+)/i);
      return {
        kind: 'update',
        summary: `Updates rows in ${table}`,
        destructive: noWhere,
        warning: noWhere ? `No WHERE clause: every row in ${table} will be changed.` : undefined,
      };
    }
    case 'delete': {
      const table = tableOf(text, /\bfrom\s+([\w.]+)/i);
      return {
        kind: 'delete',
        summary: `Deletes rows from ${table}`,
        destructive: true,
        warning: noWhere ? `No WHERE clause: every row in ${table} will be deleted.` : undefined,
      };
    }
    case 'drop': {
      const m = text.match(/^\s*drop\s+(\w+)\s+(?:if\s+exists\s+)?([\w.]+)/i);
      return { kind: 'drop', summary: `Drops ${m?.[1]?.toLowerCase() ?? 'object'} ${m?.[2] ?? ''}`.trim(), destructive: true };
    }
    case 'alter': {
      const table = tableOf(text, /^\s*alter\s+table\s+([\w.]+)/i);
      return { kind: 'alter', summary: `Alters the structure of ${table}`, destructive: false };
    }
    default:
      return null;
  }
}

export function analyzeSql(source: string): SqlChange[] {
  return stripNoise(source)
    .split(';')
    .map(classify)
    .filter((change): change is SqlChange => change !== null);
}
