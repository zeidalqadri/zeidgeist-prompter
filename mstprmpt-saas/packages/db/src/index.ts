import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export function createDb(dbPath?: string) {
  if (_db) return _db;
  const path = dbPath || process.env['DATABASE_PATH'] || './data/mstprmpt.db';
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  _db = drizzle(sqlite, { schema });
  return _db;
}

export type Database = ReturnType<typeof createDb>;

export * from './schema';
