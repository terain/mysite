# mysite

Личный сайт: Astro на Node.js, свой сервер Hetzner за Caddy. База — SQLite, файлы и бэкапы — pCloud.
Как всё устроено, наглядно: страница `/server`.
Адрес: https://strokov.me.

## Разделы

| Путь | Что там | Где править |
| --- | --- | --- |
| `/` | Пустая заглушка (разделы только по прямой ссылке) | `src/pages/index.astro` |
| `/diaspora` | Карта диаспоры в Гливице | `src/pages/diaspora/`, таблица `places` в базе |
| `/dnd` | DnD | Markdown в `src/content/dnd/` |
| `/dnd/map` | Карта мира DnD | `src/content/dnd-map/`, тайлы `public/dnd/map/` |
| `/quest` | Квест | Markdown в `src/content/quest/`, ответы в базе |
| `/misc` | Другое | Markdown в `src/content/misc/` |
| `/media/*` | Файлы из pCloud `<PCLOUD_ROOT>/media/` с кэшем на диске | `src/pages/media/[...path].ts` |
| `/api/places` | Места для карты | `src/pages/api/places.ts` |
| `/api/suggestions` | Приём предложений мест с карты | `src/pages/api/suggestions.ts` |
| `/api/backup` | Бэкап базы в pCloud (только с сервера, токен `BACKUP_TOKEN`) | `src/pages/api/backup.ts` |
| `/server` | Схема работы сайта и сервера | `src/pages/server/index.astro` |
| `/diaspora/admin` | Модерация предложений и правка мест (пароль `ADMIN_PASSWORD`) | `src/pages/diaspora/admin.astro` |

Карта диаспоры: вид карты (подложка, маска вокруг города, граница) — `src/diaspora/map.ts`,
категории — `src/diaspora/categories.ts`, граница Гливице — `src/diaspora/gliwice-boundary.json`
(официальная граница PRG ГУГиК, упрощена до ~4 м).

Карта мира DnD (`/dnd/map`):

- Подложка — тайлы `public/dnd/map/tiles/<уровень>/<x>/<y>.webp` и `public/dnd/map/map.json`
  (размер холста и число уровней). Целую `земля.svg` (55 МБ) браузер рисует по минуте,
  поэтому карта «запекается» в картинки: `scripts/dnd-map-tiles.py земля.svg public/dnd/map`
  (rsvg-convert в 2× размере холста, нарезка по 512 px, ~15 МиБ).
  `scripts/dnd-map-sync.sh [путь к земля.svg]` делает это и сразу commit + push.
- Слои — `src/content/dnd-map/layers.json`: `kind: zones` (области) или `icons` (значки).
- Объекты — `src/content/dnd-map/<id слоя>/<объект>.md`: `title`, `sum## Локально

```sh
npm install
cp .env.example .env   # PCLOUD_TOKEN нужен для /media и бэкапов, ADMIN_PASSWORD для админки
npm run dev            # база создаётся в ./data/site.db, миграции применяются сами
```

## Сервер

Hetzner, Ubuntu, 2.29.204.181. Всё для сервера лежит в `deploy/`:

- `setup.sh` — первая настройка (Node.js, Caddy, пользователь `mysite`, службы, файрвол):
  `curl -fsSL https://raw.githubusercontent.com/terain/mysite/main/deploy/setup.sh | sudo bash -s -- main`
- `update.sh` → `/usr/local/bin/mysite-update` — автодеплой. Таймер `mysite-update` раз в 2 минуты сверяет
  последний коммит ветки `DEPLOY_BRANCH` (из `/etc/mysite/env`), собирает его в `/srv/mysite/releases/<sha>`,
  переключает `/srv/mysite/current` и перезапускает сайт. Хранятся 3 последние версии.
- `import.sh` → `sudo mysite-import [файл.json]` — залить в базу бэкап (без файла — последний из pCloud).
- `secrets.sh` → `sudo mysite-secrets` — сменить пароль админки или токен pCloud (со звёздочками, ввод дважды).
- `Caddyfile` — HTTPS, сжатие, кэш статики; `/api/backup` снаружи закрыт.
- `systemd/` — `mysite` (сайт), `mysite-update.timer`, `mysite-backup.timer` (03:00 UTC), `mysite-restart.path`.

Секреты и настройки — `/etc/mysite/env`: `ADMIN_PASSWORD`, `PCLOUD_TOKEN`, `BACKUP_TOKEN`, `PCLOUD_*`, `DATA_DIR`, `DEPLOY_BRANCH`.

## pCloud

- Папка в pCloud: `/site/media/` для картинок, `/site/backup/db/` для бэкапов (корень меняется в `PCLOUD_ROOT`).
- Регион API: `eapi.pcloud.com` для EU-аккаунтов, `api.pcloud.com` для US (`PCLOUD_API_HOST`).
- Бэкап базы каждый день в 03:00 UTC (таймер `mysite-backup`), хранятся последние `BACKUP_KEEP_DAYS` файлов.

## Схема базы

Миграции в `migrations/`. Новое изменение схемы — новый файл `000N_*.sql`, старые не править.
Миграции применяются сами при первом запросе к базе после старта.
