// Single source of truth for the preloaded SQL tables: the UI shows them
// (SEED_TABLE_INFO) until the first run, and SQL_SEED (generated from
// SEED_TABLES) is what the worker runs to build a fresh database, i.e. on the
// first run and after "Reset data".
export interface SeedColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  references?: string;
}

export interface SeedTable {
  name: string;
  columns: SeedColumn[];
  rows: (string | number)[][];
}

// What the UI panels render: the seed tables at first, then a snapshot of the
// live database after every run (so user-created tables and edits show up).
export interface TableInfo {
  name: string;
  columns: { name: string; type: string; primaryKey?: boolean }[];
  rows: unknown[][];
  totalRows: number;
}

export const SEED_TABLES: SeedTable[] = [
  {
    name: 'Customers',
    columns: [
      { name: 'customer_id', type: 'INTEGER', primaryKey: true },
      { name: 'first_name', type: 'TEXT' },
      { name: 'last_name', type: 'TEXT' },
      { name: 'age', type: 'INTEGER' },
      { name: 'country', type: 'TEXT' },
    ],
    rows: [
      [1, 'John', 'Doe', 31, 'USA'],
      [2, 'Robert', 'Luna', 22, 'USA'],
      [3, 'David', 'Robinson', 22, 'UK'],
      [4, 'John', 'Reinhardt', 25, 'UK'],
      [5, 'Betty', 'Doe', 28, 'UAE'],
    ],
  },
  {
    name: 'Orders',
    columns: [
      { name: 'order_id', type: 'INTEGER', primaryKey: true },
      { name: 'item', type: 'TEXT' },
      { name: 'amount', type: 'INTEGER' },
      { name: 'customer_id', type: 'INTEGER', references: 'Customers (customer_id)' },
    ],
    rows: [
      [1, 'Keyboard', 400, 4],
      [2, 'Mouse', 300, 4],
      [3, 'Monitor', 12000, 3],
      [4, 'Keyboard', 400, 1],
      [5, 'Mousepad', 250, 2],
    ],
  },
  {
    name: 'Shippings',
    columns: [
      { name: 'shipping_id', type: 'INTEGER', primaryKey: true },
      { name: 'status', type: 'TEXT' },
      { name: 'customer', type: 'INTEGER', references: 'Customers (customer_id)' },
    ],
    rows: [
      [1, 'Pending', 2],
      [2, 'Pending', 4],
      [3, 'Delivered', 3],
      [4, 'Pending', 5],
      [5, 'Delivered', 1],
    ],
  },
];

export const SEED_TABLE_INFO: TableInfo[] = SEED_TABLES.map((t) => ({ ...t, totalRows: t.rows.length }));

function literal(value: string | number): string {
  return typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "''")}'`;
}

function tableSql(table: SeedTable): string {
  const columns = table.columns
    .map((c) => `  ${c.name} ${c.type}${c.primaryKey ? ' PRIMARY KEY' : ''}${c.references ? ` REFERENCES ${c.references}` : ''}`)
    .join(',\n');
  const rows = table.rows.map((row) => `  (${row.map(literal).join(', ')})`).join(',\n');
  return `CREATE TABLE ${table.name} (\n${columns}\n);\nINSERT INTO ${table.name} VALUES\n${rows};`;
}

export const SQL_SEED = SEED_TABLES.map(tableSql).join('\n\n');

// Given to the AI assistant so it knows the current schema even if the user
// deletes the comment from their script.
export function describeSchema(tables: TableInfo[]): string {
  return [
    '-- Tables currently in the database (changes persist between runs until "Reset data"):',
    ...tables.map((t) => `--   ${t.name}(${t.columns.map((c) => c.name).join(', ')})`),
  ].join('\n');
}
