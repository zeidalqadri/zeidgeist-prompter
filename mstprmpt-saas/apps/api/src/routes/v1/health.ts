import { Hono } from 'hono';
import { LLMProviderFactory, getEnabledProviders } from '@mstprmpt/engine';

const app = new Hono();

app.get('/', async (c) => {
  const enabledProviders = getEnabledProviders();

  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      providers: {
        enabled: enabledProviders,
        count: enabledProviders.length,
      },
    },
  });
});

app.get('/providers', async (c) => {
  const statuses = await LLMProviderFactory.getHealthStatus();
  return c.json({ success: true, data: statuses });
});

export default app;
