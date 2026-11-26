// Единая точка доступа к настройкам и базе (вместо `cloudflare:workers`).
import { resolve } from 'node:path';
import { openDb, type Db } from './db';

const e = process.env;
const DATA_DIR = resolve(e.DATA_DIR || './data');

let db: Db | undefined;

export const env: Env = {
  // База открывается при первом запросе, а не при сборке статических страниц.
  get DB() {
    return (db ??= openDb(DATA_DIR, resolve(e.MIGRATIONS_DIR || './migrations')));
  },
  PCLOUD_API_HOST: e.PCLOUD_API_HOST || 'eapi.pcloud.com',
  PCLOUD_ROOT: e.PCLOUD_ROOT || '/site',
  BACKUP_KEEP_DAYS: e.BACKUP_KEEP_DAYS || '30',
  PCLOUD_TOKEN: e.PCLOUD_TOKEN || '',
  ADMIN_PASSWORD: e.ADMIN_PASSWORD || '',
  BACKUP_TOKEN: e.BACKUP_TOKEN || '',
  DATA_DIR,
};
