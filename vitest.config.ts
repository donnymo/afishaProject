import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    decorator: { legacy: true, emitDecoratorMetadata: true },
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['server/**/*.spec.ts', 'src/**/*.test.ts'],
        },
      },
      {
        // Интеграционные сценарии поднимают AppModule целиком против базы TEST_DATABASE_URL.
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          globalSetup: ['test/global-setup.ts'],
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
          env: {
            DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
            JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256-signing',
            JWT_EXPIRES_IN: '900',
          },
        },
      },
    ],
  },
});
