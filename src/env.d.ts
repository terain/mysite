// Секреты не попадают в `wrangler types`, объявляем их сами.
interface SecretsEnv {
  PCLOUD_TOKEN: string;
  ADMIN_PASSWORD: string;
}
interface Env extends SecretsEnv {}
declare namespace Cloudflare {
  interface Env extends SecretsEnv {}
}
