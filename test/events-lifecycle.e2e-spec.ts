import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bearer, createTestApp, expectError, inDays, login, type SeedIds } from './helpers.js';

describe('Владение карточкой и публикация', () => {
  let app: INestApplication;
  let ids: SeedIds;
  let owner: string;
  let stranger: string;
  let moderator: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const t = await createTestApp();
    app = t.app;
    ids = await t.reseed();
    [owner, stranger, moderator] = await Promise.all([
      login(app, 'resonance'),
      login(app, 'sokol'),
      login(app, 'moderator'),
    ]);
  });
  afterAll(() => app.close());

  async function createDraft(body: Record<string, unknown> = {}) {
    const res = await http()
      .post('/events')
      .set(bearer(owner))
      .send({ title: 'Вечер камерной музыки', ...body })
      .expect(201);
    return res.body as { id: string; status: string };
  }

  it('организатор создаёт неполный черновик', async () => {
    const draft = await createDraft();
    expect(draft).toMatchObject({ status: 'draft', venue: null, startsAt: null, categories: [] });
  });

  it('черновик не виден публике и чужому организатору, но виден владельцу', async () => {
    const draft = await createDraft();
    expectError(await http().get(`/events/${draft.id}`), 404, 'EVENT_NOT_FOUND');
    expectError(await http().get(`/events/${draft.id}`).set(bearer(stranger)), 404, 'EVENT_NOT_FOUND');
    await http().get(`/events/${draft.id}`).set(bearer(owner)).expect(200);
  });

  it('чужой организатор не может изменить или опубликовать карточку — 403', async () => {
    const draft = await createDraft();
    expectError(
      await http().patch(`/events/${draft.id}`).set(bearer(stranger)).send({ title: 'Захват' }),
      403,
      'FORBIDDEN_NOT_OWNER',
    );
    expectError(await http().post(`/events/${draft.id}/publish`).set(bearer(stranger)), 403, 'FORBIDDEN_NOT_OWNER');
    expectError(
      await http().patch(`/events/${ids.events.quartet}`).set(bearer(owner)).send({ price: 1 }),
      403,
      'FORBIDDEN_NOT_OWNER',
    );
  });

  it('модератор не может создавать и править события — 403 по роли', async () => {
    expectError(
      await http().post('/events').set(bearer(moderator)).send({ title: 'Модераторское' }),
      403,
      'FORBIDDEN_ROLE',
    );
    expectError(
      await http().patch(`/events/${ids.events.openmic}`).set(bearer(moderator)).send({ title: 'Правка' }),
      403,
      'FORBIDDEN_ROLE',
    );
  });

  it('статус нельзя поменять через PATCH', async () => {
    const draft = await createDraft();
    const body = expectError(
      await http().patch(`/events/${draft.id}`).set(bearer(owner)).send({ status: 'published' }),
      400,
      'VALIDATION_FAILED',
    );
    expect(body.details[0].field).toBe('status');
  });

  it('публикация неполного черновика — 400 EVENT_NOT_READY со списком полей', async () => {
    const draft = await createDraft();
    const body = expectError(
      await http().post(`/events/${draft.id}/publish`).set(bearer(owner)),
      400,
      'EVENT_NOT_READY',
    );
    expect(body.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['description', 'startsAt', 'endsAt', 'price', 'ageLimit', 'venueId', 'categoryIds']),
    );
  });

  it('проверяет диапазон дат и существование площадки', async () => {
    const draft = await createDraft();
    expectError(
      await http()
        .patch(`/events/${draft.id}`)
        .set(bearer(owner))
        .send({ startsAt: inDays(5, 19), endsAt: inDays(5, 18) }),
      400,
      'VALIDATION_FAILED',
    );
    const missingVenue = expectError(
      await http()
        .patch(`/events/${draft.id}`)
        .set(bearer(owner))
        .send({ venueId: '00000000-0000-4000-8000-000000000000' }),
      400,
      'VALIDATION_FAILED',
    );
    expect(missingVenue.details).toEqual([{ field: 'venueId', issue: 'Площадка не найдена' }]);
    expectError(
      await http().patch(`/events/${draft.id}`).set(bearer(owner)).send({ startsAt: 'завтра' }),
      400,
      'VALIDATION_FAILED',
    );
  });

  it('заполненный черновик публикуется, появляется в афише, повторная публикация — 409', async () => {
    const draft = await createDraft({
      description: 'Струнное трио играет Гайдна и Шуберта.',
      startsAt: inDays(3, 19),
      endsAt: inDays(3, 21),
      price: 700,
      ageLimit: 6,
      venueId: ids.venues.severny,
      categoryIds: [ids.categories.concert],
    });

    const published = await http().post(`/events/${draft.id}/publish`).set(bearer(owner)).expect(200);
    expect(published.body).toMatchObject({ status: 'published', publishedAt: expect.any(String) });

    await http().get(`/events/${draft.id}`).expect(200);
    const list = await http().get('/events?category=concert&pageSize=50').expect(200);
    expect(list.body.items.map((e: { id: string }) => e.id)).toContain(draft.id);

    expectError(await http().post(`/events/${draft.id}/publish`).set(bearer(owner)), 409, 'INVALID_STATE_TRANSITION');
  });

  it('черновик с началом в прошлом не публикуется', async () => {
    const draft = await createDraft({
      description: 'Описание',
      startsAt: inDays(-1, 19),
      endsAt: inDays(-1, 21),
      price: 0,
      ageLimit: 0,
      venueId: ids.venues.shtab,
      categoryIds: [ids.categories.lecture],
    });
    const body = expectError(
      await http().post(`/events/${draft.id}/publish`).set(bearer(owner)),
      400,
      'EVENT_NOT_READY',
    );
    expect(body.details).toEqual([{ field: 'startsAt', issue: 'Начало уже прошло' }]);
  });

  it('у начавшегося события начало нельзя перенести в прошлое — 409, а окончание сдвинуть можно', async () => {
    const id = ids.events.streetfood; // идёт с -4 по +7 день
    const body = expectError(
      await http()
        .patch(`/events/${id}`)
        .set(bearer(owner))
        .send({ startsAt: inDays(-10, 12) }),
      409,
      'EVENT_ALREADY_STARTED',
    );
    expect(body.details[0].field).toBe('startsAt');

    const res = await http()
      .patch(`/events/${id}`)
      .set(bearer(owner))
      .send({ endsAt: inDays(9, 22) })
      .expect(200);
    expect(res.body.endsAt).toBe(inDays(9, 22));
  });

  it('опубликованное событие нельзя «опустошить» через PATCH', async () => {
    const body = expectError(
      await http().patch(`/events/${ids.events.openmic}`).set(bearer(owner)).send({ venueId: null }),
      400,
      'VALIDATION_FAILED',
    );
    expect(body.details).toEqual([{ field: 'venueId', issue: 'Не выбрана площадка' }]);
  });

  it('«Мои события» показывают все статусы владельца и только его', async () => {
    const res = await http().get('/events/mine?pageSize=50').set(bearer(owner)).expect(200);
    const statuses = new Set(res.body.items.map((e: { status: string }) => e.status));
    expect(statuses).toEqual(new Set(['draft', 'published', 'hidden']));
    expect(res.body.items.every((e: { owner: { name: string } }) => e.owner.name === 'Студия «Резонанс»')).toBe(true);

    const hidden = res.body.items.find((e: { status: string }) => e.status === 'hidden');
    expect(hidden.hiddenReason).toMatch(/Недостоверная цена/);

    const drafts = await http().get('/events/mine?status=draft').set(bearer(owner)).expect(200);
    expect(drafts.body.items.every((e: { status: string }) => e.status === 'draft')).toBe(true);
  });

  it('неизвестное и некорректное id', async () => {
    expectError(await http().get('/events/00000000-0000-4000-8000-000000000000'), 404, 'EVENT_NOT_FOUND');
    expectError(await http().get('/events/not-a-uuid'), 400, 'VALIDATION_FAILED');
    expectError(
      await http().post('/events/00000000-0000-4000-8000-000000000000/publish').set(bearer(owner)),
      404,
      'EVENT_NOT_FOUND',
    );
  });
});
