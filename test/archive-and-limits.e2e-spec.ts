import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SEED_USERS } from '../prisma/seed-data.js';
import { EventsArchiver } from '../server/events/events-archiver.js';
import type { PrismaService } from '../server/prisma/prisma.service.js';
import { bearer, createTestApp, expectError, inDays, login, type SeedIds } from './helpers.js';

const idsOf = (res: request.Response): string[] => res.body.items.map((e: { id: string }) => e.id);

describe('Архив, счётчики и ограничения', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: SeedIds;
  let owner: string;
  let stranger: string;
  let moderator: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const t = await createTestApp();
    ({ app, prisma } = t);
    ids = await t.reseed();
    [owner, stranger, moderator] = await Promise.all([
      login(app, 'resonance'),
      login(app, 'sokol'),
      login(app, 'moderator'),
    ]);
  });
  afterAll(() => app.close());

  /** Публикует событие и «проматывает время»: даты сдвигаются в прошлое напрямую в базе. */
  async function publishedThenEnded() {
    const draft = await http()
      .post('/events')
      .set(bearer(owner))
      .send({
        title: 'Лекция, которая уже прошла',
        description: 'Описание',
        startsAt: inDays(2, 19),
        endsAt: inDays(2, 21),
        price: 0,
        ageLimit: 0,
        venueId: ids.venues.severny,
        categoryIds: [ids.categories.concert],
      })
      .expect(201);
    await http().post(`/events/${draft.body.id}/publish`).set(bearer(owner)).expect(200);
    await prisma.event.update({
      where: { id: draft.body.id },
      data: { startsAt: new Date(inDays(-2, 19)), endsAt: new Date(inDays(-2, 21)) },
    });
    return draft.body.id as string;
  }

  describe('архивация закончившихся событий', () => {
    it('переводит закончившееся опубликованное событие в archived и не трогает остальные', async () => {
      const id = await publishedThenEnded();
      const before = await prisma.event.groupBy({ by: ['status'], _count: { _all: true } });

      expect(await app.get(EventsArchiver).archiveEnded()).toBeGreaterThanOrEqual(1);

      const event = await prisma.event.findUniqueOrThrow({ where: { id } });
      expect(event.status).toBe('archived');
      const draftsBefore = before.find((g) => g.status === 'draft')?._count._all ?? 0;
      expect(await prisma.event.count({ where: { status: 'draft' } })).toBe(draftsBefore);
      expect(await prisma.event.count({ where: { status: 'published', endsAt: { lt: new Date() } } })).toBe(0);
    });

    it('повторный запуск ничего не меняет', async () => {
      await app.get(EventsArchiver).archiveEnded();
      expect(await app.get(EventsArchiver).archiveEnded()).toBe(0);
    });

    it('архивное событие: публике 404, владельцу видно, изменить нельзя — 409', async () => {
      const id = await publishedThenEnded();
      await app.get(EventsArchiver).archiveEnded();

      expectError(await http().get(`/events/${id}`), 404, 'EVENT_NOT_FOUND');
      const own = await http().get(`/events/${id}`).set(bearer(owner)).expect(200);
      expect(own.body.status).toBe('archived');
      expectError(
        await http().patch(`/events/${id}`).set(bearer(owner)).send({ title: 'Новое название' }),
        409,
        'EVENT_ARCHIVED',
      );
      expectError(
        await http().post(`/events/${id}/hide`).set(bearer(moderator)).send({ reason: 'Причина достаточной длины' }),
        409,
        'INVALID_STATE_TRANSITION',
      );

      const mine = await http().get('/events/mine?status=archived&pageSize=50').set(bearer(owner)).expect(200);
      expect(mine.body.items.map((e: { id: string }) => e.id)).toContain(id);
    });
  });

  it('скрытие сразу убирает событие из закэшированной афиши', async () => {
    const before = await http().get('/events?pageSize=50').expect(200);
    const target: string = idsOf(before)[0];
    await http()
      .post(`/events/${target}/hide`)
      .set(bearer(moderator))
      .send({ reason: 'Проверка сброса кэша афиши' })
      .expect(200);
    const after = await http().get('/events?pageSize=50').expect(200);
    expect(idsOf(after)).not.toContain(target);
  });

  describe('счётчики вкладок', () => {
    it('организатор получает свои счётчики одним запросом, и они сходятся со списками', async () => {
      const { body: counts } = await http().get('/events/mine/counts').set(bearer(owner)).expect(200);
      expect(counts.all).toBe(counts.draft + counts.published + counts.hidden + counts.archived);
      const all = await http().get('/events/mine?pageSize=1').set(bearer(owner)).expect(200);
      expect(all.body.total).toBe(counts.all);
      const drafts = await http().get('/events/mine?status=draft&pageSize=1').set(bearer(owner)).expect(200);
      expect(drafts.body.total).toBe(counts.draft);
    });

    it('чужие события в счётчики организатора не попадают', async () => {
      const own = await http().get('/events/mine/counts').set(bearer(owner)).expect(200);
      const other = await http().get('/events/mine/counts').set(bearer(stranger)).expect(200);
      const total = await prisma.event.count();
      expect(own.body.all + other.body.all).toBeLessThanOrEqual(total);
      expect(own.body.all).toBe(await prisma.event.count({ where: { owner: { email: SEED_USERS.resonance.email } } }));
    });

    it('модератор видит размер очереди без черновиков', async () => {
      const { body } = await http().get('/events/moderation/counts').set(bearer(moderator)).expect(200);
      expect(Object.keys(body).toSorted()).toEqual(['hidden', 'published']);
      const hidden = await http().get('/events/moderation?status=hidden&pageSize=1').set(bearer(moderator));
      expect(hidden.body.total).toBe(body.hidden);
    });

    it('без токена 401, чужая роль 403', async () => {
      expectError(await http().get('/events/mine/counts'), 401, 'UNAUTHORIZED');
      expectError(await http().get('/events/moderation/counts'), 401, 'UNAUTHORIZED');
      expectError(await http().get('/events/mine/counts').set(bearer(moderator)), 403, 'FORBIDDEN_ROLE');
      expectError(await http().get('/events/moderation/counts').set(bearer(owner)), 403, 'FORBIDDEN_ROLE');
    });
  });

  describe('публичная выдача', () => {
    it('глубже 200-й страницы листать нельзя', async () => {
      await http().get('/events?page=200').expect(200);
      const body = expectError(await http().get('/events?page=201'), 400, 'VALIDATION_FAILED');
      expect(body.details).toEqual([expect.objectContaining({ field: 'page' })]);
    });

    it('разрешает CDN кэшировать выдачу, а браузеру — нет', async () => {
      const res = await http().get('/events').expect(200);
      expect(res.headers['cache-control']).toMatch(/^public, max-age=0, s-maxage=\d+$/);
    });
  });

  describe('ограничение попыток входа', () => {
    it('после 10 попыток на один email — 429 с Retry-After, другой email пускают', async () => {
      // Несуществующий адрес: лимит одинаков для всех email и не выдаёт, есть ли аккаунт.
      const email = 'brute-force-target@example.ru';
      for (let i = 0; i < 10; i++) {
        await http().post('/auth/login').send({ email, password: 'wrong-password' }).expect(401);
      }
      const blocked = await http().post('/auth/login').send({ email, password: 'wrong-password' });
      expectError(blocked, 429, 'TOO_MANY_REQUESTS');
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);

      // Регистр и пробелы не дают обойти лимит.
      expectError(
        await http()
          .post('/auth/login')
          .send({ email: ` ${email.toUpperCase()} `, password: 'x' }),
        429,
        'TOO_MANY_REQUESTS',
      );

      await login(app, 'moderator');
    });
  });
});

describe('Ограничение попыток входа по IP', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });
  afterAll(() => app.close());

  it('после 20 попыток в минуту с одного адреса — 429 даже для разных email', async () => {
    for (let i = 0; i < 20; i++) {
      await http()
        .post('/auth/login')
        .send({ email: `nobody-${i}@example.ru`, password: 'x' })
        .expect(401);
    }
    expectError(
      await http().post('/auth/login').send({ email: 'nobody-20@example.ru', password: 'x' }),
      429,
      'TOO_MANY_REQUESTS',
    );
  });
});
