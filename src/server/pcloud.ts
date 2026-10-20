// Минимальный клиент HTTP API pCloud: https://docs.pcloud.com/
// Токен — OAuth access_token, хранится как секрет PCLOUD_TOKEN.

type PcloudEnv = Pick<Env, 'PCLOUD_API_HOST' | 'PCLOUD_TOKEN'>;

interface PcloudResponse {
  result: number;
  error?: string;
  [key: string]: unknown;
}

async function call<T extends PcloudResponse>(
  env: PcloudEnv,
  method: string,
  params: Record<string, string> = {},
  init?: RequestInit,
): Promise<T> {
  const url = new URL(`https://${env.PCLOUD_API_HOST}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', env.PCLOUD_TOKEN);
  const res = await fetch(url, init);
  const data = (await res.json()) as T;
  if (data.result !== 0) throw new Error(`pCloud ${method}: ${data.result} ${data.error ?? ''}`);
  return data;
}

/**
 * Скачивает файл по пути. Ссылка из getfilelink временная и привязана к IP,
 * поэтому запрашиваем её и сразу качаем из того же Worker.
 */
export async function fetchFile(env: PcloudEnv, path: string): Promise<Response> {
  const link = await call<PcloudResponse & { hosts: string[]; path: string }>(env, 'getfilelink', { path });
  return fetch(`https://${link.hosts[0]}${link.path}`);
}

export async function ensureFolder(env: PcloudEnv, path: string): Promise<void> {
  await call(env, 'createfolderifnotexists', { path });
}

export async function uploadText(env: PcloudEnv, folder: string, filename: string, body: string): Promise<void> {
  const form = new FormData();
  form.append('file', new Blob([body], { type: 'application/json' }), filename);
  await call(env, 'uploadfile', { path: folder, filename, nopartial: '1' }, { method: 'POST', body: form });
}

export async function listFolder(env: PcloudEnv, path: string): Promise<{ name: string; isfolder: boolean }[]> {
  const data = await call<PcloudResponse & { metadata: { contents?: { name: string; isfolder: boolean }[] } }>(
    env,
    'listfolder',
    { path },
  );
  return data.metadata.contents ?? [];
}

export async function deleteFile(env: PcloudEnv, path: string): Promise<void> {
  await call(env, 'deletefile', { path });
}
