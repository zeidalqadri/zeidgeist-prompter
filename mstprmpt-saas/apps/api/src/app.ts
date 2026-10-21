import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as pinoLogger } from './lib/logger';

import authRoutes from './routes/v1/auth';
import enhanceRoutes from './routes/v1/enhance';
import keysRoutes from './routes/v1/keys';
import usageRoutes from './routes/v1/usage';
import billingRoutes from './routes/v1/billing';
import healthRoutes from './routes/v1/health';
import stripeWebhookRoutes from './routes/webhooks/stripe';

function parseAllowedOrigins(raw: string | undefined): string[] {
  const DEFAULT_ORIGINS = ['http://localhost:3000'];

  if (!raw) {
    return DEFAULT_ORIGINS;
  }

  const candidates = raw.split(',').map((o) => o.trim());
  const valid: string[] = [];

  for (const origin of candidates) {
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      valid.push(origin);
    } else if (origin.length > 0) {
      pinoLogger.warn({ rejectedOrigin: origin }, 'CORS origin rejected: must start with http:// or https://');
    }
  }

  if (valid.length === 0) {
    pinoLogger.warn('No valid CORS origins after filtering; falling back to default');
    return DEFAULT_ORIGINS;
  }

  return valid;
}

const allowedOrigins = parseAllowedOrigins(process.env['CORS_ORIGINS']);

const app = new Hono();

// Global middleware
app.use('*', cors({
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  pinoLogger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  }, `${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`);
});

// Global error handler
app.onError((err, c) => {
  pinoLogger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env['NODE_ENV'] === 'production'
        ? 'An internal error occurred'
        : err.message,
    },
  }, 500);
});

// Routes
app.route('/v1/auth', authRoutes);
app.route('/v1/enhance', enhanceRoutes);
app.route('/v1/keys', keysRoutes);
app.route('/v1/usage', usageRoutes);
app.route('/v1/billing', billingRoutes);
app.route('/v1/health', healthRoutes);
app.route('/webhooks/stripe', stripeWebhookRoutes);

// Root
app.get('/', (c) => c.json({
  name: 'mstprmpt API',
  version: '0.1.0',
  docs: '/v1/health',
}));

export default app;
