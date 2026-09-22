import app, { ensureDatabaseInitialized } from '../server.ts';

export default async function handler(req: any, res: any) {
  await ensureDatabaseInitialized().catch(() => {});
  return app(req, res);
}
