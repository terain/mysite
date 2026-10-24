import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// DnD: src/content/dnd/<раздел>/<статья>.md
const dnd = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/dnd' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().default(0),
    // Страницы «только для мастера» потом закроем Cloudflare Access
    gmOnly: z.boolean().default(false),
  }),
});

// Карта мира DnD: слои — src/content/dnd-map/layers.json,
// объекты — src/content/dnd-map/<id слоя>/<объект>.md (слой берётся из папки).
// Координаты — в единицах холста карты (viewBox земля.svg, как X/Y в Inkscape, y вниз).
const dndLayers = defineCollection({
  loader: file('./src/content/dnd-map/layers.json'),
  schema: z.object({
    title: z.string(),
    // zones — области (политика, биомы, влияние), icons — значки (поселения, порталы)
    kind: z.enum(['zones', 'icons']),
    color: z.string().default('#8a5a2b'),
    visible: z.boolean().default(true),
    order: z.number().default(0),
  }),
});

const point = z.tuple([z.number(), z.number()]);
const dndPlaces = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/dnd-map' }),
  schema: z
    .object({
      title: z.string(),
      // Строка в списке слева и в подсказке на карте
      summary: z.string().optional(),
      // Значок: эмодзи или 1–2 буквы. По умолчанию — точка цвета слоя
      icon: z.string().optional(),
      color: z.string().optional(),
      // Значок: point: [x, y]. Область: area: [[x, y], [x, y], ...]
      point: point.optional(),
      area: z.array(point).min(3).optional(),
      order: z.number().default(0),
      gmOnly: z.boolean().default(false),
    })
    .refine((d) => d.point || d.area, { message: 'Нужно point или area' }),
});

// Квест: текст задания. Ответ хранится только в D1 (quest_steps), не здесь.
const quest = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/quest' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(0),
  }),
});

const misc = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/misc' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date().optional(),
  }),
});

export const collections = { dnd, dndLayers, dndPlaces, quest, misc };
