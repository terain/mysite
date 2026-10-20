// Вход в админку карты: один пароль из секрета ADMIN_PASSWORD, cookie — HMAC от него.
// Сменить пароль = разлогинить всех.

const COOKIE = 'diaspora_admin';
const enc = new TextEncoder();

async function sign(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode('diaspora-admin-v1'));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isAdmin(env: Pick<Env, 'ADMIN_PASSWORD'>, cookie: string | undefined): Promise<boolean> {
  if (!env.ADMIN_PASSWORD || !cookie) return false;
  return same(cookie, await sign(env.ADMIN_PASSWORD));
}

export async function checkPassword(env: Pick<Env, 'ADMIN_PASSWORD'>, password: string): Promise<string | null> {
  if (!env.ADMIN_PASSWORD) return null;
  const [a, b] = await Promise.all([sign(env.ADMIN_PASSWORD), sign(password)]);
  return same(a, b) ? a : null;
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_COOKIE_OPTIONS = {
  path: '/diaspora/admin',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 30,
} as const;
