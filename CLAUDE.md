# mysite

Личный сайт Максима. Общение и тексты сайта — по-русски, раздел диаспоры — по-украински.

- Стек: Astro 7 + `@astrojs/cloudflare`, один Worker (`src/worker.ts`: fetch → Astro, scheduled → бэкап).
- Страницы статические по умолчанию; серверные помечаются `export const prerender = false`.
- Bindings берутся через `import { env } from 'cloudflare:workers'` (`Astro.locals.runtime` в v6+ удалён).
- D1 (`env.DB`) — рабочая база. pCloud — только хранилище файлов и бэкапов, через `src/server/pcloud.ts`.
  Прямые ссылки pCloud в HTML не вставлять: они временные и привязаны к IP. Картинки — через `/media/*`.
- Схема: только новые файлы в `migrations/`.
- Проверка перед PR: `npx astro check` и `npm run build`.
- Разделы изолированы: главная `/` — пустая заглушка, в шапке только свой раздел, ссылок между разделами нет.
- Ветки: `main` = прод; задачи в ветках вида `diaspora/...`, `dnd/...`, `quest/...`.
