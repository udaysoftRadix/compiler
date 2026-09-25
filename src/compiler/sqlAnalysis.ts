// Best-effort static scan of a SQL script for statements that change data or
// schema, used to ask for confirmation before running. It is a heuristic (not a
// SQL parser): comments and string literals are blanked out first so text
// like 'delete' never triggers it, then each statement is classified by its
// leading keyword.
export interface SqlIssue {
  id: string;
  title: string;
  description: string;
}

type Kind = 'insert' | 'update' | 'delete' | 'drop' | 'alter';

function stripNoise(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/'(?:[^']|'')*'?/g, "''")
    .replace(/"([^"]*)"|`([^`]*)`|\[([^\]]*)\]/g, (_, a, b, c) => (a ?? b ?? c ?? '').replace(/\W+/g, '_'));
}

function classify(statement: string): { kind: Kind; noWhere: boolean } | null {
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
    case 'replace':
      return { kind: 'insert', noWhere: false };
    case 'update':
      return { kind: 'update', noWhere };
    case 'delete':
      return { kind: 'delete', noWhere };
    case 'drop':
      return { kind: 'drop', noWhere: false };
    case 'alter':
      return { kind: 'alter', noWhere: false };
    default:
      return null;
  }
}

export function analyzeSql(source: string): SqlIssue[] {
  const statements = stripNoise(source)
    .split(';')
    .map(classify)
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const issues: SqlIssue[] = [];
  const add = (issue: SqlIssue) => {
    if (!issues.some((existing) => existing.id === issue.id)) issues.push(issue);
  };

  if (statements.some((s) => s.kind === 'delete' || s.kind === 'drop')) {
    add({
      id: 'destructive',
      title: 'Query has destructive operation',
      description: 'Make sure you are not accidentally removing something important.',
    });
  }

  for (const s of statements) {
    if ((s.kind === 'update' || s.kind === 'delete') && s.noWhere) {
      add({
        id: `no-where-${s.kind}`,
        title: `Query uses ${s.kind} without a where clause`,
        description: `Without a where clause, this could ${s.kind} all rows in the table.`,
      });
    }
  }

  if (statements.some((s) => s.kind === 'insert' || s.kind === 'update')) {
    add({
      id: 'modifies',
      title: 'Query modifies data',
      description: 'This query adds or changes rows. Make sure that is what you intended.',
    });
  }

  if (statements.some((s) => s.kind === 'alter')) {
    add({
      id: 'alter',
      title: 'Query alters a table',
      description: 'This changes the structure of an existing table. Make sure that is what you intended.',
    });
  }

  return issues;
}
