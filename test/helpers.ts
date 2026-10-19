import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { seed, SEED_PASSWORD, SEED_USERS } from '../prisma/seed-data.js';
import { AppModule } from '../server/app.module.js';
import { configureApp } from '../server/app.setup.js';
import { PrismaService } from '../server/prisma/prisma.service.js';

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: ['error'] }));
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma, reseed: () => seed(prisma) };
}

export type SeedIds = Awaited<ReturnType<typeof seed>>;

export async function login(app: INestApplication, who: keyof typeof SEED_USERS) {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: SEED_USERS[who].email, password: SEED_PASSWORD })
    .expect(200);
  return res.body.accessToken as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Проверяет единый формат ошибки и возвращает тело. */
export function expectError(res: request.Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(res.body).toMatchObject({
    code,
    message: expect.any(String),
    details: expect.any(Array),
    requestId: expect.any(String),
  });
  expect(res.headers['x-request-id']).toBe(res.body.requestId);
  return res.body as { code: string; message: string; details: { field?: string; issue: string }[]; requestId: string };
}

export const inDays = (days: number, hour = 19) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(hour - 3, 0, 0, 0);
  return d.toISOString();
};
