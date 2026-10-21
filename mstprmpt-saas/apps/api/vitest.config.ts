import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@mstprmpt/engine': path.resolve(__dirname, '../../packages/engine/src/index.ts'),
      '@mstprmpt/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
      '@mstprmpt/db/types': path.resolve(__dirname, '../../packages/db/src/types.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
