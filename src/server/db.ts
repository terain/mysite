// База сайта: SQLite-файл через встроенный node:sqlite.
// Обёртка повторяет нужную часть API Cloudflare D1 (prepare → bind → first/all/run),
// поэтому запросы в страницах остались как были.
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Param = SQLInputValue | boolean | undefined;

function norm(params: Param[]): SQLInputValue[] {
  return params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? Number(p) : p));
}

export class Statement {
  constructor(
    private db: DatabaseSync,
    private sql: string,
    private params: SQLInputValue[] = [],
  ) {}

  bind(...params: Param[]): Statement {
    return new Statement(this.db, this.sql, norm(params));
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    return { results: this.db.prepare(this.sql).all(...this.params) as T[] };
  }

  async run(): Promise<{ meta: { changes: number; last_row_id: number } }> {
    const r = this.db.prepare(this.sql).run(...this.params);
    return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export class Db {
  constructor(readonly raw: DatabaseSync) {}
  prepare(sql: string): Statement {
    return new Statement(this.raw, sql);
  }
}

/**
 * Применяет новые файлы из migrations/ по порядку имён.
 * Учёт в таблице d1_migrations, как было у wrangler, чтобы перенесённая база знала, что уже применено.
 */
export function migrate(db: DatabaseSync, dir: string): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS d1_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const done = new Set((db.prepare('SELECT name FROM d1_migrations').all() as { name: string }[]).map((r) => r.name));
  const applied: string[] = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(name)) continue;
    db.exec('BEGIN');
    try {
      db.exec(readFileSync(join(dir, name), 'utf8'));
      db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').run(name);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw new Error(`migration ${name}: ${(e as Error).message}`);
    }
    applied.push(name);
  }
  return applied;
}

export function openDb(dataDir: string, migrationsDir: string): Db {
  mkdirSync(dataDir, { recursive: true });
  const raw = new DatabaseSync(join(dataDir, 'site.db'));
  raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const applied = migrate(raw, migrationsDir);
  if (applied.length) console.log(`db: applied ${applied.join(', ')}`);
  return new Db(raw);
}
