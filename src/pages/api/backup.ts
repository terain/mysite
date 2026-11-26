import type { APIRoute } from 'astro';
import { backupDatabase } from '../../server/backup';
import { env } from '../../server/env';

export const prerender = false;

// Ночной бэкап базы в pCloud. Вызывает таймер mysite-backup на сервере (deploy/),
// снаружи путь закрыт в Caddy, плюс нужен токен BACKUP_TOKEN.
export const POST: APIRoute = async ({ request }) => {
  if (!env.BACKUP_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.BACKUP_TOKEN}`) {
    return new Response('Not found', { status: 404 });
  }
  const path = await backupDatabase(env);
  console.log(`backup saved: ${path}`);
  return Response.json({ ok: true, path });
};
