import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { parsePlace } from '../../diaspora/place';

export const prerender = false;

const PER_DAY = 5;

async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`suggest:${ip}`));
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Предложение нового места с карты диаспоры. Попадает в suggestions и ждёт модерации в /diaspora/admin.
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  // Поле-ловушка: человек его не видит, боты заполняют.
  if (String(form.get('company') ?? '')) return Response.json({ ok: true });

  const parsed = parsePlace(form);
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  const ip = await hashIp(request.headers.get('CF-Connecting-IP') ?? 'unknown');
  const recent = await env.DB.prepare(
    `SELECT count(*) AS n FROM suggestions
     WHERE json_extract(payload, '$.ip') = ? AND created_at > datetime('now', '-1 day')`,
  )
    .bind(ip)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= PER_DAY) {
    return Response.json({ error: 'Забагато пропозицій за добу, спробуйте завтра.' }, { status: 429 });
  }

  const note = String(form.get('note') ?? '').trim().slice(0, 500) || null;
  await env.DB.prepare('INSERT INTO suggestions (payload) VALUES (?)')
    .bind(JSON.stringify({ ...parsed.place, note, ip }))
    .run();
  return Response.json({ ok: true });
};
