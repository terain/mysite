# mysite

Личный сайт: Astro в одном Cloudflare Worker. База — Cloudflare D1, файлы и бэкапы — pCloud.
Адрес: https://strokov.me. Подробная архитектура: [документ](https://claude.ai/artifact/QfbfKq9kmiX8jV8hrmoGTV).

## Разделы

| Путь | Что там | Где править |
| --- | --- | --- |
| `/` | Пустая заглушка (разделы только по прямой ссылке) | `src/pages/index.astro` |
| `/diaspora` | Карта диаспоры в Гливице | `src/pages/diaspora/`, таблица `places` в D1 |
| `/dnd` | DnD | Markdown в `src/content/dnd/` |
| `/dnd/map` | Карта мира DnD | `src/content/dnd-map/`, подложка `public/dnd/map/base.svg` |
| `/quest` | Квест | Markdown в `src/content/quest/`, ответы в D1 |
| `/misc` | Другое | Markdown в `src/content/misc/` |
| `/media/*` | Файлы из pCloud `<PCLOUD_ROOT>/media/` с кэшем | `src/pages/media/[...path].ts` |
| `/api/places` | Места для карты | `src/pages/api/places.ts` |
| `/api/suggestions` | Приём предложений мест с карты | `src/pages/api/suggestions.ts` |
| `/diaspora/admin` | Модерация предложений и правка мест (пароль `ADMIN_PASSWORD`) | `src/pages/diaspora/admin.astro` |

Карта диаспоры: вид карты (подложка, маска вокруг города, граница) — `src/diaspora/map.ts`,
категории — `src/diaspora/categories.ts`, граница Гливице — `src/diaspora/gliwice-boundary.json`
(официальная граница PRG ГУГиК, упрощена до ~4 м).

Карта мира DnD (`/dnd/map`):

- Подложка — запечённый SVG `public/dnd/map/base.svg`, его размер (viewBox) — в `src/dnd/base.json`.
  Полная карта собирается у Максима (`собрать.py`), затем
  `scripts/dnd-map-bake.py земля.svg земля-запечённая.svg` выкидывает служебное Inkscape,
  скрытые слои и лишние знаки в координатах, а `scripts/dnd-map-sync.sh [путь к svg]`
  кладёт запечённую копию в сайт и делает commit + push. Файл больше 25 МиБ Cloudflare не примет.
- Слои — `src/content/dnd-map/layers.json`: `kind: zones` (области) или `icons` (значки).
- Объекты — `src/content/dnd-map/<id слоя>/<объект>.md`: `title`, `summary`, `icon`, `color`,
  `point: [x, y]` или `area: [[x, y], ...]` в единицах SVG; текст файла — карточка справа.
  Координаты удобно снимать на `/dnd/map?edit`. `gmOnly: true` — объект на сайт не попадает.

## Локально

```sh
npm install
cp .dev.vars.example .dev.vars   # вписать PCLOUD_TOKEN, если нужен /media
npm run db:migrate:local
npm run dev
```

## Первый деплой

1. `npx wrangler login`
2. База `mysite-db` уже создана (EEUR), id в `wrangler.jsonc`, миграции 0001–0002 применены, 0003 нужно применить
3. `npm run db:migrate:remote`
4. `npx wrangler secret put PCLOUD_TOKEN` и `npx wrangler secret put ADMIN_PASSWORD`
5. `npm run deploy`

Дальше удобнее подключить репозиторий в Cloudflare (Workers → Settings → Builds), тогда каждый push в `main` деплоит сам.

## pCloud

- Папка в pCloud: `/site/media/` для картинок, `/site/backup/db/` для бэкапов (корень меняется в `PCLOUD_ROOT`).
- Регион API: `eapi.pcloud.com` для EU-аккаунтов, `api.pcloud.com` для US (`PCLOUD_API_HOST`).
- Бэкап D1 запускается cron-триггером каждый день в 03:00 UTC, хранятся последние `BACKUP_KEEP_DAYS` файлов.

## Схема базы

Миграции в `migrations/`. Новое изменение схемы — новый файл `000N_*.sql`, старые не править.
После правки `wrangler.jsonc` перегенерировать типы: `npx wrangler types`.
