// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Страницы по умолчанию статические. Серверные помечаются `export const prerender = false`.
// Сайт работает как обычный Node-сервер за Caddy (см. deploy/).
export default defineConfig({
  site: 'https://strokov.me',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  security: {
    // Caddy передаёт X-Forwarded-Host/Proto: доверяем им только для своих адресов,
    // иначе проверка Origin у POST-форм сравнивала бы https с http.
    allowedDomains: [
      { hostname: 'strokov.me', protocol: 'https' },
      { hostname: 'www.strokov.me', protocol: 'https' },
      // Временный адрес для проверки сервера до переключения DNS.
      { hostname: '2-29-204-181.sslip.io', protocol: 'https' },
    ],
  },
});
