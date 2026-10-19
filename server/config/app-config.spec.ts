import { AppConfig } from './app-config.js';

const validEnv = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('AppConfig', () => {
  it('подставляет значения по умолчанию', () => {
    const config = new AppConfig(validEnv);
    expect(config).toMatchObject({
      port: 3000,
      jwtExpiresIn: 900,
      corsOrigins: ['http://localhost:5173'],
      archiveIntervalSeconds: 300,
      publicCacheTtlSeconds: 10,
      trustProxyHops: 0,
    });
  });

  it('разрешает выключить кэш нулём, но не отрицательным числом', () => {
    expect(new AppConfig({ ...validEnv, PUBLIC_CACHE_TTL_SECONDS: '0' }).publicCacheTtlSeconds).toBe(0);
    expect(() => new AppConfig({ ...validEnv, PUBLIC_CACHE_TTL_SECONDS: '-1' })).toThrow(
      /PUBLIC_CACHE_TTL_SECONDS must be a non-negative integer/,
    );
  });

  it('разбирает список CORS-источников', () => {
    const config = new AppConfig({ ...validEnv, CORS_ORIGINS: ' https://a.ru , ,https://b.ru' });
    expect(config.corsOrigins).toEqual(['https://a.ru', 'https://b.ru']);
  });

  it('перечисляет все проблемы окружения сразу', () => {
    expect(() => new AppConfig({ JWT_SECRET: 'short', PORT: 'abc' })).toThrow(
      /PORT must be a positive integer[\s\S]*DATABASE_URL must be set[\s\S]*JWT_SECRET must be set/,
    );
  });
});
