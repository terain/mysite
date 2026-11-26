#!/usr/bin/env node
// Переносит данные из JSON-бэкапа (формат src/server/backup.ts) в SQLite-базу сайта.
//   node scripts/import-backup.mjs [файл.json]
// Без файла скачивает самый свежий бэкап из pCloud (<PCLOUD_ROOT>/backup/db/), нужен PCLOUD_TOKEN.
// Таблицы в базе очищаются и заполняются из бэкапа. Схема — из migrations/ (применяются сами).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const e = process.env;
const DATA_DIR = resolve(e.DATA_DIR || './data');
const MIGRATIONS = resolve(e.MIGRATIONS_DIR || './migrations');

async function pcloud(method, params) {
  const url = new URL(`https://${e.PCLOUD_API_HOST || 'eapi.pcloud.com'}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', e.PCLOUD_TOKEN);
  const data = await (await fetch(url)).json();
  if (data.result !== 0) throw new Error(`pCloud ${method}: ${data.result} ${data.error ?? ''}`);
  return data;
}

async function latestFromPcloud() {
  if (!e.PCLOUD_TOKEN) throw new Error('нет PCLOUD_TOKEN: укажите файл бэкапа или токен');
  const folder = `${e.PCLOUD_ROOT || '/site'}/backup/db`;
  const list = await pcloud('listfolder', { path: folder });
  const name = (list.metadata.contents ?? [])
    .map((f) => f.name)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort()
    .pop();
  if (!name) throw new Error(`в ${folder} нет бэкапов`);
  const link = await pcloud('getfilelink', { path: `${folder}/${name}` });
  console.log(`бэкап: ${folder}/${name}`);
  return (await fetch(`https://${link.hosts[0]}${link.path}`)).text();
}

const file = process.argv[2];
const dump = JSON.parse(file ? readFileSync(file, 'utf8') : await latestFromPcloud());
console.log(`бэкап создан: ${dump.createdAt}`);

mkdirSync(DATA_DIR, { recursive: true });
const dbPath = join(DATA_DIR, 'site.db');
if (existsSync(dbPath)) {
  const copy = `${dbPath}.before-import-${Date.now()}`;
  copyFileSync(dbPath, copy);
  console.log(`старая база сохранена: ${copy}`);
}
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = OFF;');

// Схема: те же миграции и тот же учёт, что в src/server/db.ts.
db.exec(`CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`);
const done = new Set(db.prepare('SELECT name FROM d1_migrations').all().map((r) => r.name));
for (const name of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(name)) continue;
  db.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
  db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').run(name);
  console.log(`миграция ${name}`);
}

db.exec('BEGIN');
for (const [table, rows] of Object.entries(dump.tables)) {
  const cols = db.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name);
  if (!cols.length) {
    console.log(`пропуск ${table}: такой таблицы нет`);
    continue;
  }
  db.exec(`DELETE FROM "${table}"`);
  for (const row of rows) {
    const keys = Object.keys(row).filter((k) => cols.includes(k));
    db.prepare(`INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
      .run(...keys.map((k) => row[k]));
  }
  console.log(`${table}: ${rows.length}`);
}
db.exec('COMMIT');
console.log(`готово: ${dbPath}`);
