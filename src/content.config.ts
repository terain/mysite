import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
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

export const collections = { dnd, quest, misc };
