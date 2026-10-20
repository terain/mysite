import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { fetchFile } from '../../server/pcloud';

export const prerender = false;

const WEEK = 60 * 60 * 24 * 7;
const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

// /media/dnd/map.jpg → <PCLOUD_ROOT>/media/dnd/map.jpg на pCloud, с кэшем Cloudflare на неделю.
export const GET: APIRoute = async ({ params, request, locals }) => {
  const path = params.path ?? '';
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (!path || path.split('/').some((p) => p === '..' || p === '') || !(ext in TYPES)) {
    return new Response('Not found', { status: 404 });
  }

  // В типах DOM нет caches.default, в Workers он есть.
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let upstream: Response;
  try {
    upstream = await fetchFile(env, `${env.PCLOUD_ROOT}/media/${path}`);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!upstream.ok) return new Response('Upstream error', { status: 502 });

  const response = new Response(upstream.body, {
    headers: {
      'Content-Type': TYPES[ext],
      'Cache-Control': `public, max-age=${WEEK}`,
    },
  });
  locals.cfContext.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
};
