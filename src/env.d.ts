import type { Db } from './server/db';

declare global {
  /** Настройки и база сайта. Значения — из переменных окружения (~/mysite/env на сервере, .env локально). */
  interface Env {
    DB: Db;
    PCLOUD_API_HOST: string;
    PCLOUD_ROOT: string;
    BACKUP_KEEP_DAYS: string;
    PCLOUD_TOKEN: string;
    /** Токен для POST /api/backup (его дёргает таймер на сервере). Пусто = эндпоинт выключен. */
    BACKUP_TOKEN: string;
    /** Папка с базой и кэшем. */
    DATA_DIR: string;
  }
}
