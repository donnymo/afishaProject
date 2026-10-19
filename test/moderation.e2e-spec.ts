import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bearer, createTestApp, expectError, login, type SeedIds } from './helpers.js';

describe('Модераторское скрытие', () => {
  let app: INestApplication;
  let ids: SeedIds;
  let organizer: string;
  let moderator: string;
  const http = () => request(app.getHttpServer());
  const REASON = 'Реклама розыгрыша вместо описания события: нет программы и состава.';

  beforeAll(async () => {
    const t = await createTestApp();
    app = t.app;
    ids = await t.reseed();
    [organizer, moderator] = await Promise.all([login(app, 'resonance'), login(app, 'moderator')]);
  });
  afterAll(() => app.close());

  it('организатору скрытие недоступно — 403 FORBIDDEN_ROLE', async () => {
    expectError(
      await http().post(`/events/${ids.events.surprise}/hide`).set(bearer(organizer)).send({ reason: REASON }),
      403,
      'FORBIDDEN_ROLE',
    );
    expectError(await http().get('/events/moderation').set(bearer(organizer)), 403, 'FORBIDDEN_ROLE');
  });

  it('гостю скрытие недоступно — 401', async () => {
    expectError(await http().post(`/events/${ids.events.surprise}/hide`).send({ reason: REASON }), 401, 'UNAUTHORIZED');
  });

  it('причина обязательна и не короче 10 символов', async () => {
    expectError(
      await http().post(`/events/${ids.events.surprise}/hide`).set(bearer(moderator)).send({}),
      400,
      'VALIDATION_FAILED',
    );
    const body = expectError(
      await http().post(`/events/${ids.events.surprise}/hide`).set(bearer(moderator)).send({ reason: '   спам   ' }),
      400,
      'VALIDATION_FAILED',
    );
    expect(body.details[0]).toEqual({ field: 'reason', issue: 'Причина не короче 10 символов' });
  });

  it('модератор скрывает опубликованное событие, оно пропадает из публичной выдачи', async () => {
    const id = ids.events.surprise;
    const before = await http().get('/events?pageSize=50').expect(200);
    expect(before.body.items.map((e: { id: string }) => e.id)).toContain(id);

    const res = await http().post(`/events/${id}/hide`).set(bearer(moderator)).send({ reason: REASON }).expect(200);
    expect(res.body).toMatchObject({ status: 'hidden', hiddenReason: REASON, hiddenAt: expect.any(String) });

    expectError(await http().get(`/events/${id}`), 404, 'EVENT_NOT_FOUND');
    const after = await http().get('/events?pageSize=50').expect(200);
    expect(after.body.items.map((e: { id: string }) => e.id)).not.toContain(id);
    expect(after.body.total).toBe(before.body.total - 1);

    // Модератор и владелец по-прежнему видят карточку и причину.
    const asModerator = await http().get(`/events/${id}`).set(bearer(moderator)).expect(200);
    expect(asModerator.body.hiddenReason).toBe(REASON);
    const queue = await http().get('/events/moderation?status=hidden').set(bearer(moderator)).expect(200);
    expect(queue.body.items.map((e: { id: string }) => e.id)).toContain(id);
  });

  it('повторное скрытие и скрытие черновика — 409', async () => {
    expectError(
      await http().post(`/events/${ids.events.lightshadow}/hide`).set(bearer(moderator)).send({ reason: REASON }),
      409,
      'INVALID_STATE_TRANSITION',
    );
    expectError(
      await http().post(`/events/${ids.events.choir}/hide`).set(bearer(moderator)).send({ reason: REASON }),
      409,
      'INVALID_STATE_TRANSITION',
    );
  });

  it('владелец не может править скрытое событие — 409 EVENT_HIDDEN', async () => {
    expectError(
      await http().patch(`/events/${ids.events.lightshadow}`).set(bearer(organizer)).send({ price: 400 }),
      409,
      'EVENT_HIDDEN',
    );
  });

  it('скрытие несуществующего события — 404', async () => {
    expectError(
      await http()
        .post('/events/00000000-0000-4000-8000-000000000000/hide')
        .set(bearer(moderator))
        .send({ reason: REASON }),
      404,
      'EVENT_NOT_FOUND',
    );
  });

  it('очередь модерации по умолчанию — опубликованные события всех организаторов', async () => {
    const res = await http().get('/events/moderation?pageSize=50').set(bearer(moderator)).expect(200);
    expect(res.body.items.every((e: { status: string }) => e.status === 'published')).toBe(true);
    expect(new Set(res.body.items.map((e: { owner: { name: string } }) => e.owner.name)).size).toBeGreaterThan(1);
    expectError(await http().get('/events/moderation?status=draft').set(bearer(moderator)), 400, 'VALIDATION_FAILED');
  });
});
