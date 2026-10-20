# mysite

Личный сайт: Astro в одном Cloudflare Worker. База — Cloudflare D1, файлы и бэкапы — pCloud.
Адрес: https://strokov.me. Подробная архитектура: [документ](https://claude.ai/artifact/QfbfKq9kmiX8jV8hrmoGTV).

## Разделы

| Путь | Что там | Где править |
| --- | --- | --- |
| `/` | Главная | `src/pages/index.astro` |
| `/diaspora` | Карта диаспоры в Гливице | `src/pages/diaspora/`, таблица `places` в D1 |
| `/dnd` | DnD | Markdown в `src/content/dnd/` |
| `/quest` | Квест | Markdown в `src/content/quest/`, ответы в D1 |
| `/misc` | Другое | Markdown в `src/content/misc/` |
| `/media/*` | Файлы из pCloud `<PCLOUD_ROOT>/media/` с кэшем | `src/pages/media/[...path].ts` |
| `/api/places` | Места для карты | `src/pages/api/places.ts` |

## Локально

```sh
npm install
cp .dev.vars.example .dev.vars   # вписать PCLOUD_TOKEN, если нужен /media
npm run db:migrate:local
npm run dev
```

## Первый деплой

1. `npx wrangler login`
2. База `mysite-db` уже создана (EEUR), id в `wrangler.jsonc`, миграции 0001–0002 применены
3. `npm run db:migrate:remote`
4. `npx wrangler secret put PCLOUD_TOKEN`
5. `npm run deploy`

Дальше удобнее подключить репозиторий в Cloudflare (Workers → Settings → Builds), тогда каждый push в `main` деплоит сам.

## pCloud

- Папка в pCloud: `/site/media/` для картинок, `/site/backup/db/` для бэкапов (корень меняется в `PCLOUD_ROOT`).
- Регион API: `eapi.pcloud.com` для EU-аккаунтов, `api.pcloud.com` для US (`PCLOUD_API_HOST`).
- Бэкап D1 запускается cron-триггером каждый день в 03:00 UTC, хранятся последние `BACKUP_KEEP_DAYS` файлов.

## Схема базы

Миграции в `migrations/`. Новое изменение схемы — новый файл `000N_*.sql`, старые не править.
После правки `wrangler.jsonc` перегенерировать типы: `npx wrangler types`.
