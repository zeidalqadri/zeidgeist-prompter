import { serve } from '@hono/node-server';
import { logger as pinoLogger } from './lib/logger';
import app from './app';

const port = parseInt(process.env['PORT'] || '3100', 10);

serve({ fetch: app.fetch, port }, (info) => {
  pinoLogger.info(`mstprmpt API running on http://localhost:${info.port}`);
});

export default app;
