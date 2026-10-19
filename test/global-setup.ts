import 'dotenv/config';
import { execSync } from 'node:child_process';

/**
 * Применяет миграции к тестовой базе. Данные каждый набор тестов
 * пересоздаёт сам через seed(), поэтому сброс базы не нужен.
 */
export default function setup(): void {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error('TEST_DATABASE_URL is not set (см. .env.example)');

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
