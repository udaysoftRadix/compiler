// Persists the SQL playground database (the SQLite file plus the table
// snapshot the panels render) in IndexedDB, so it survives page reloads.
// IndexedDB rather than localStorage: the database is binary and can outgrow
// localStorage's ~5MB string quota. Every function fails soft — if storage is
// unavailable (private mode, blocked site data) the playground just behaves
// as an in-memory database.
import type { TableInfo } from '../compiler/sqlSeed';

export interface StoredSqlState {
  db: Uint8Array;
  tables: TableInfo[];
}

const DB_NAME = 'online-code-compiler';
const STORE = 'sql-playground';
const KEY = 'database-v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSqlState(): Promise<StoredSqlState | null> {
  try {
    const stored = await withStore<StoredSqlState | undefined>('readonly', (store) => store.get(KEY));
    return stored?.db instanceof Uint8Array && Array.isArray(stored.tables) ? stored : null;
  } catch {
    return null;
  }
}

export async function saveSqlState(state: StoredSqlState): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(state, KEY));
  } catch {
    // storage unavailable or full; the in-memory database still works
  }
}

export async function clearSqlState(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(KEY));
  } catch {
    // nothing to clear
  }
}
