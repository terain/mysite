import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Опубликованные места для карты диаспоры.
export const GET: APIRoute = async () => {
  const { results } = await env.DB.prepare(
    `SELECT slug, name, kind, description, address, lat, lng, languages, hours, contacts, photo
     FROM places WHERE status = 'published' ORDER BY name`,
  ).all();
  return Response.json(results, { headers: { 'Cache-Control': 'public, max-age=300' } });
};
