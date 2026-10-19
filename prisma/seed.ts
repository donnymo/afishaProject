import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../server/generated/prisma/client.js';
import { SEED_PASSWORD, SEED_USERS, seed } from './seed-data.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

try {
  const { events } = await seed(prisma);
  console.log(`Seed: ${Object.keys(events).length} событий, ${Object.keys(SEED_USERS).length} пользователя.`);
  console.log(`Аккаунты (пароль ${SEED_PASSWORD}):`);
  for (const u of Object.values(SEED_USERS)) console.log(`  ${u.role.padEnd(9)} ${u.email}`);
} finally {
  await prisma.$disconnect();
}
