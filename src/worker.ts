import { handle } from '@astrojs/cloudflare/handler';
import { backupDatabase } from './server/backup';

export default {
  fetch: handle,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(backupDatabase(env).then((path) => console.log(`backup saved: ${path}`)));
  },
} satisfies ExportedHandler<Env>;
