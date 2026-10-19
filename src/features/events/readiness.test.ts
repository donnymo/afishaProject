import { describe, expect, it } from 'vitest';
import { readinessChecks, type ReadinessInput } from './readiness';

const now = Date.parse('2026-10-09T12:00:00Z');

const complete: ReadinessInput = {
  status: 'draft',
  title: 'Джазовый вечер',
  description: 'Два отделения',
  startsAt: '2026-10-20T17:00:00Z',
  endsAt: '2026-10-20T20:00:00Z',
  price: 0,
  ageLimit: 18,
  venueId: 'venue',
  categoryCount: 1,
};

const missing = (input: ReadinessInput) =>
  readinessChecks(input, now)
    .filter((check) => !check.ok)
    .map((check) => check.missing);

describe('readinessChecks', () => {
  it('полностью заполненный черновик готов; бесплатная цена считается заполненной', () => {
    expect(missing(complete)).toEqual([]);
  });

  it('перечисляет пустые поля', () => {
    expect(
      missing({
        ...complete,
        description: ' ',
        startsAt: null,
        endsAt: null,
        price: null,
        venueId: null,
        categoryCount: 0,
      }),
    ).toEqual(['описание', 'начало', 'окончание', 'площадка', 'цена', 'категория']);
  });

  it('черновику нужно начало в будущем, а идущему опубликованному — нет', () => {
    const started = { ...complete, startsAt: '2026-10-09T10:00:00Z', endsAt: '2026-10-09T14:00:00Z' };
    expect(missing(started)).toEqual(['некорректное начало']);
    expect(missing({ ...started, status: 'published' })).toEqual([]);
  });

  it('окончание должно быть позже начала', () => {
    expect(missing({ ...complete, endsAt: complete.startsAt })).toEqual(['окончание позже начала']);
  });
});
