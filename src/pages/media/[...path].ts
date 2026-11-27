import type { APIRoute } from 'astro';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { env } from '../../server/env';
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

// /media/photos/cat.jpg → <PCLOUD_ROOT>/media/photos/cat.jpg на pCloud.
// Скачанный файл неделю лежит на диске сервера (<DATA_DIR>/cache/media/), pCloud дёргаем только при промахе.
export const GET: APIRoute = async ({ params }) => {
  const path = params.path ?? '';
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (!path || path.split('/').some((p) => p === '..' || p === '' || p === '.') || !(ext in TYPES)) {
    return new Response('Not found', { status: 404 });
  }
  const headers = { 'Content-Type': TYPES[ext], 'Cache-Control': `public, max-age=${WEEK}` };
  const file = join(env.DATA_DIR, 'cache', 'media', path);

  try {
    const s = await stat(file);
    if (Date.now() - s.mtimeMs < WEEK * 1000) return new Response(new Uint8Array(await readFile(file)), { headers });
  } catch {
    // нет в кэше
  }

  let upstream: Response;
  try {
    upstream = await fetchFile(env, `${env.PCLOUD_ROOT}/media/${path}`);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!upstream.ok) return new Response('Upstream error', { status: 502 });

  const body = new Uint8Array(await upstream.arrayBuffer());
  try {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(`${file}.tmp`, body);
    await rename(`${file}.tmp`, file);
  } catch (e) {
    console.error('media cache:', e);
  }
  return new Response(body, { headers });
};
