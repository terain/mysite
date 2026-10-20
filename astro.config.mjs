// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Страницы по умолчанию статические. Серверные помечаются `export const prerender = false`.
export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
});
