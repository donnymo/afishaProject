import { describe, expect, it } from 'vitest';
import { applyPatch, countActive, datePresets, readFilters, toApiParams } from './filters';

describe('фильтры афиши', () => {
  it('читает значения по умолчанию из пустого URL', () => {
    const filters = readFilters(new URLSearchParams());
    expect(filters).toMatchObject({ sort: 'date_asc', page: 1, pageSize: '12', categories: [] });
    expect(countActive(filters)).toBe(0);
  });

  it('превращает URL в параметры API', () => {
    const filters = readFilters(new URLSearchParams('category=concert,theatre&sort=price_desc&page=2'));
    expect(toApiParams(filters)).toMatchObject({
      category: 'concert,theatre',
      city: 'moscow',
      sort: 'price',
      order: 'desc',
      page: 2,
      pageSize: 12,
    });
    expect(countActive(filters)).toBe(2);
  });

  it('сбрасывает страницу при смене фильтра и удаляет пустые значения', () => {
    const next = applyPatch(new URLSearchParams('page=3&category=concert'), { category: null, minPrice: '500' });
    expect(next.toString()).toBe('minPrice=500');
    expect(applyPatch(new URLSearchParams('page=3'), { sort: 'price_asc' }, { keepPage: true }).get('page')).toBe('3');
  });

  it('считает «выходные» по московскому календарю', () => {
    // Пятница, 9 октября 2026, 23:30 по Москве.
    const friday = new Date('2026-10-09T20:30:00Z');
    expect(datePresets(friday).find((p) => p.key === 'weekend')).toMatchObject({
      from: '2026-10-10',
      to: '2026-10-11',
    });

    // Воскресенье: выходные — это сегодня.
    const sunday = new Date('2026-10-11T09:00:00Z');
    expect(datePresets(sunday).find((p) => p.key === 'weekend')).toMatchObject({
      from: '2026-10-11',
      to: '2026-10-11',
    });
  });
});
