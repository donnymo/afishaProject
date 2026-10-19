import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { SEED_PASSWORD, SEED_USERS } from '../prisma/seed-data.js';
import type { PrismaService } from '../server/prisma/prisma.service.js';
import { bearer, createTestApp, expectError, login } from './helpers.js';

describe('Аутентификация', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp().then(async (t) => (await t.reseed(), t)));
  });
  afterAll(() => app.close());

  it('вход выдаёт JWT, с которым открывается /auth/me', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'Organizer@Afisha.local ', password: SEED_PASSWORD })
      .expect(200);
    expect(res.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { email: SEED_USERS.resonance.email, role: 'organizer' },
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const me = await request(app.getHttpServer()).get('/auth/me').set(bearer(res.body.accessToken)).expect(200);
    expect(me.body).toMatchObject({ email: SEED_USERS.resonance.email, role: 'organizer' });
  });

  it('неверный пароль и неизвестный email дают одинаковый 401', async () => {
    const wrongPass = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: SEED_USERS.resonance.email, password: 'nope-nope' });
    const noUser = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@afisha.local', password: 'nope-nope' });
    expect(expectError(wrongPass, 401, 'INVALID_CREDENTIALS').message).toBe(
      expectError(noUser, 401, 'INVALID_CREDENTIALS').message,
    );
  });

  it('без токена защищённый маршрут отвечает 401 UNAUTHORIZED', async () => {
    expectError(await request(app.getHttpServer()).get('/auth/me'), 401, 'UNAUTHORIZED');
    expectError(await request(app.getHttpServer()).get('/events/mine'), 401, 'UNAUTHORIZED');
  });

  it('просроченный токен отвечает 401 TOKEN_EXPIRED', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: SEED_USERS.resonance.email } });
    const expired = app.get(JwtService).sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    expectError(await request(app.getHttpServer()).get('/events/mine').set(bearer(expired)), 401, 'TOKEN_EXPIRED');
  });

  it('подделанный токен отвечает 401 UNAUTHORIZED', async () => {
    const token = await login(app, 'resonance');
    const [h, p] = token.split('.');
    const forged = `${h}.${p}.${'A'.repeat(43)}`;
    expectError(await request(app.getHttpServer()).get('/auth/me').set(bearer(forged)), 401, 'UNAUTHORIZED');
  });

  it('регистрация создаёт организатора и хранит только хеш пароля', async () => {
    const password = 'very-secret-password';
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Театр «Тест»', email: 'test@example.ru', password })
      .expect(201);
    expect(res.body.user.role).toBe('organizer');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'test@example.ru' } });
    expect(stored.passwordHash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$/);
    expect(stored.passwordHash).not.toContain(password);

    expectError(
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Дубль', email: 'TEST@example.ru', password }),
      409,
      'EMAIL_TAKEN',
    );
  });

  it('регистрация не принимает роль и короткий пароль', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Хитрец', email: 'sly@example.ru', password: 'short', role: 'moderator' });
    const body = expectError(res, 400, 'VALIDATION_FAILED');
    expect(body.details.map((d) => d.field)).toEqual(expect.arrayContaining(['password', 'role']));
  });

  it('клиентский X-Request-Id возвращается в ответе и в теле ошибки', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').set('X-Request-Id', 'client-trace-12345');
    expect(expectError(res, 401, 'UNAUTHORIZED').requestId).toBe('client-trace-12345');
  });
});
