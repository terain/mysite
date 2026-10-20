import { deleteFile, ensureFolder, listFolder, uploadText } from './pcloud';

/** Выгружает все таблицы D1 в JSON и кладёт в <PCLOUD_ROOT>/backup/db/YYYY-MM-DD.json. */
export async function backupDatabase(env: Env): Promise<string> {
  const { results: tables } = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations'",
  ).all<{ name: string }>();

  const dump: Record<string, unknown[]> = {};
  for (const { name } of tables) {
    const { results } = await env.DB.prepare(`SELECT * FROM "${name}"`).all();
    dump[name] = results;
  }

  const folder = `${env.PCLOUD_ROOT}/backup/db`;
  const filename = `${new Date().toISOString().slice(0, 10)}.json`;
  await ensureFolder(env, `${env.PCLOUD_ROOT}/backup`);
  await ensureFolder(env, folder);
  await uploadText(env, folder, filename, JSON.stringify({ createdAt: new Date().toISOString(), tables: dump }));

  // Имена вида YYYY-MM-DD.json сортируются по дате как строки.
  const keep = Number(env.BACKUP_KEEP_DAYS) || 30;
  const old = (await listFolder(env, folder))
    .filter((f) => !f.isfolder && /^\d{4}-\d{2}-\d{2}\.json$/.test(f.name))
    .map((f) => f.name)
    .sort()
    .slice(0, -keep);
  for (const name of old) await deleteFile(env, `${folder}/${name}`);

  return `${folder}/${filename}`;
}
