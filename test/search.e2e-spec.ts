import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { buildOpenApi } from '../server/app.setup.js';
import { createTestApp, expectError, type SeedIds } from './helpers.js';

interface Item {
  id: string;
  title: string;
  status: string;
  city: string;
  price: number;
  startsAt: string;
  endsAt: string;
  categories: { slug: string }[];
}

describe('Публичный поиск', () => {
  let app: INestApplication;
  let ids: SeedIds;
  const get = (qs: string) => request(app.getHttpServer()).get(`/events${qs}`);

  beforeAll(async () => {
    const t = await createTestApp();
    app = t.app;
    ids = await t.reseed();
  });
  afterAll(() => app.close());

  it('по умолчанию: только опубликованные и незакончившиеся, ближайшие сначала', async () => {
    const res = await get('?pageSize=50').expect(200);
    const items: Item[] = res.body.items;
    expect(res.body).toMatchObject({ page: 1, pageSize: 50, total: items.length });
    expect(items.every((e) => e.status === 'published' && new Date(e.endsAt) >= new Date())).toBe(true);

    const visible = items.map((e) => e.id);
    for (const key of ['shortfilm', 'soundlecture', 'choir', 'lightshadow', 'calligraphy'] as const) {
      expect(visible).not.toContain(ids.events[key]);
    }
    const starts = items.map((e) => e.startsAt);
    expect(starts).toEqual(starts.toSorted());
    expect(items[0]).not.toHaveProperty('hiddenReason');
  });

  it('комбинированный поиск: категории, город, цена, даты и сортировка по цене', async () => {
    const from = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const to = new Date(Date.now() + 35 * 86_400_000).toISOString().slice(0, 10);
    const res = await get(
      `?category=concert,theatre&city=moscow&minPrice=500&maxPrice=1500&from=${from}&to=${to}&sort=price&order=desc`,
    ).expect(200);
    const items: Item[] = res.body.items;

    expect(items.map((e) => e.title)).toEqual([
      'Органный концерт при свечах',
      'Струнный квартет «Северное сияние»: Шостакович и Пярт',
      'Джазовый вечер: трио «Полутон»',
    ]);
    for (const e of items) {
      expect(e.city).toBe('moscow');
      expect(e.price).toBeGreaterThanOrEqual(500);
      expect(e.price).toBeLessThanOrEqual(1500);
      expect(e.categories.some((c) => ['concert', 'theatre'].includes(c.slug))).toBe(true);
    }
    expect(res.body.total).toBe(3);
  });

  it('идущее событие попадает в диапазон дат, если пересекается с ним', async () => {
    const today = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
    const res = await get(`?from=${today}&to=${today}&category=exhibition&pageSize=50`).expect(200);
    expect(res.body.items.map((e: Item) => e.id)).toContain(ids.events.avantgarde);
  });

  it('город и бесплатные события', async () => {
    const res = await get('?city=zelenograd').expect(200);
    expect(res.body.items).toEqual([]);
    const free = await get('?maxPrice=0&pageSize=50').expect(200);
    expect(free.body.items.length).toBeGreaterThan(0);
    expect(free.body.items.every((e: Item) => e.price === 0)).toBe(true);
  });

  it('offset-пагинация: страницы не пересекаются и в сумме дают total', async () => {
    const all = await get('?pageSize=50').expect(200);
    const pages: Item[] = [];
    for (let page = 1; page <= Math.ceil(all.body.total / 4); page++) {
      const res = await get(`?pageSize=4&page=${page}`).expect(200);
      expect(res.body).toMatchObject({ page, pageSize: 4, total: all.body.total });
      pages.push(...res.body.items);
    }
    expect(pages.map((e) => e.id)).toEqual(all.body.items.map((e: Item) => e.id));

    const beyond = await get('?pageSize=4&page=99').expect(200);
    expect(beyond.body).toMatchObject({ items: [], total: all.body.total, page: 99 });
  });

  it.each([
    ['неизвестная сортировка', '?sort=title', 'sort'],
    ['неизвестный порядок', '?order=up', 'order'],
    ['слишком большая страница', '?pageSize=51', 'pageSize'],
    ['нулевая страница', '?page=0', 'page'],
    ['цена не числом', '?minPrice=дёшево', 'minPrice'],
    ['отрицательная цена', '?maxPrice=-1', 'maxPrice'],
    ['minPrice > maxPrice', '?minPrice=1000&maxPrice=10', 'maxPrice'],
    ['неверная дата', '?from=10.10.2026', 'from'],
    ['to раньше from', '?from=2026-12-10&to=2026-12-01', 'to'],
    ['неизвестная категория', '?category=opera', 'category'],
    ['неизвестный параметр', '?q=jazz', 'q'],
  ])('400 на неверный фильтр: %s', async (_, qs, field) => {
    const body = expectError(await get(qs), 400, 'VALIDATION_FAILED');
    expect(body.details.map((d) => d.field)).toContain(field);
  });

  it('справочники категорий и площадок доступны без токена', async () => {
    const cats = await request(app.getHttpServer()).get('/categories').expect(200);
    expect(cats.body.map((c: { slug: string }) => c.slug)).toEqual(
      expect.arrayContaining(['concert', 'theatre', 'kids']),
    );
    const venues = await request(app.getHttpServer()).get('/venues').expect(200);
    expect(venues.body).toHaveLength(8);
    expectError(
      await request(app.getHttpServer()).get('/venues/00000000-0000-4000-8000-000000000000'),
      404,
      'VENUE_NOT_FOUND',
    );
  });

  it('неизвестный маршрут — 404 в общем формате', async () => {
    expectError(await request(app.getHttpServer()).get('/nope'), 404, 'NOT_FOUND');
  });

  it('OpenAPI описывает публичные и защищённые маршруты, пагинацию и ошибки', () => {
    const doc = buildOpenApi(app);
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/auth/login',
        '/auth/register',
        '/events',
        '/events/{id}',
        '/events/{id}/publish',
        '/events/{id}/hide',
        '/events/mine',
        '/venues',
        '/categories',
      ]),
    );
    const list = doc.paths['/events'].get!;
    expect(list.security).toBeUndefined();
    expect((list.parameters ?? []).map((p) => ('name' in p ? p.name : ''))).toEqual(
      expect.arrayContaining([
        'page',
        'pageSize',
        'sort',
        'order',
        'category',
        'city',
        'minPrice',
        'maxPrice',
        'from',
        'to',
      ]),
    );
    expect(doc.paths['/events/{id}/publish'].post!.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(doc.paths['/events/{id}/publish'].post!.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401', '403', '404', '409']),
    );
    expect(doc.components?.schemas).toHaveProperty('ErrorResponseDto');
    expect(doc.components?.schemas).toHaveProperty('EventPageDto');
  });
});
