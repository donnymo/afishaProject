const DEFAULT_PORT = 3000;
const DEFAULT_JWT_EXPIRES_IN = 900;
const DEFAULT_CORS_ORIGINS = 'http://localhost:5173';
const MIN_JWT_SECRET_LENGTH = 32;
const DEFAULT_ARCHIVE_INTERVAL = 300;
const DEFAULT_PUBLIC_CACHE_TTL = 10;

/**
 * Типизированная конфигурация из переменных окружения.
 * Проверяется один раз при старте: приложение не поднимется с неполным .env,
 * а остальной код не читает process.env напрямую.
 */
export class AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly jwtSecret: string;
  /** Время жизни access token в секундах. */
  readonly jwtExpiresIn: number;
  readonly corsOrigins: string[];
  /** Как часто закончившиеся события переводятся в архив, в секундах. */
  readonly archiveIntervalSeconds: number;
  /** Сколько живёт кэш публичной афиши в памяти процесса, в секундах; 0 — кэш выключен. */
  readonly publicCacheTtlSeconds: number;
  /** Сколько обратных прокси стоит перед API: от этого зависит, какой IP видит лимит на вход. */
  readonly trustProxyHops: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const problems: string[] = [];

    const integer = (name: string, fallback: number, min: number) => {
      const raw = env[name];
      if (raw === undefined || raw === '') return fallback;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < min) {
        problems.push(`${name} must be ${min > 0 ? 'a positive' : 'a non-negative'} integer`);
      }
      return value;
    };

    this.port = integer('PORT', DEFAULT_PORT, 1);
    this.jwtExpiresIn = integer('JWT_EXPIRES_IN', DEFAULT_JWT_EXPIRES_IN, 1);
    this.archiveIntervalSeconds = integer('ARCHIVE_INTERVAL_SECONDS', DEFAULT_ARCHIVE_INTERVAL, 1);
    this.publicCacheTtlSeconds = integer('PUBLIC_CACHE_TTL_SECONDS', DEFAULT_PUBLIC_CACHE_TTL, 0);
    this.trustProxyHops = integer('TRUST_PROXY', 0, 0);

    this.databaseUrl = env.DATABASE_URL ?? '';
    if (!this.databaseUrl) problems.push('DATABASE_URL must be set');

    this.jwtSecret = env.JWT_SECRET ?? '';
    if (this.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      problems.push(`JWT_SECRET must be set (at least ${MIN_JWT_SECRET_LENGTH} characters)`);
    }

    this.corsOrigins = (env.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (problems.length) throw new Error(`Invalid environment:\n  - ${problems.join('\n  - ')}`);
  }
}
