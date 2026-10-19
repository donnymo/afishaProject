import { describe, expect, it } from 'vitest';
import { fmtPrice, fmtRange, fromLocalInput, isOngoing, isPast, moscowDate, plural, toLocalInput } from './format';

describe('plural', () => {
  it.each([
    [1, 'событие'],
    [2, 'события'],
    [5, 'событий'],
    [11, 'событий'],
    [21, 'событие'],
    [22, 'события'],
    [112, 'событий'],
  ])('%i → %s', (n, expected) => {
    expect(plural(n, 'событие', 'события', 'событий')).toBe(expected);
  });
});

describe('fmtPrice', () => {
  it('различает «не указано», бесплатно и цену «от»', () => {
    expect(fmtPrice(null)).toBe('—');
    expect(fmtPrice(0, { from: true })).toBe('Бесплатно');
    expect(fmtPrice(1500, { from: true }).replace(/\s/g, ' ')).toBe('от 1 500 ₽');
  });
});

describe('даты по Москве', () => {
  it('переводит ISO в значение datetime-local и обратно', () => {
    expect(toLocalInput('2026-10-09T16:00:00.000Z')).toBe('2026-10-09T19:00');
    expect(fromLocalInput('2026-10-09T19:00')).toBe('2026-10-09T19:00:00+03:00');
    expect(fromLocalInput('')).toBeNull();
  });

  it('считает календарный день по Москве, а не по UTC', () => {
    expect(moscowDate(new Date('2026-10-09T22:30:00Z'))).toBe('2026-10-10');
  });

  it('сокращает диапазон в пределах одного дня', () => {
    expect(fmtRange('2026-10-09T16:00:00Z', '2026-10-09T18:00:00Z')).toBe('9 октября, 19:00–21:00');
    expect(fmtRange(null, null)).toBe('Дата не указана');
  });
});

describe('isOngoing / isPast', () => {
  const event = { startsAt: '2026-10-09T10:00:00Z', endsAt: '2026-10-09T12:00:00Z' };

  it('зависят от переданного now', () => {
    expect(isOngoing(event, Date.parse('2026-10-09T11:00:00Z'))).toBe(true);
    expect(isOngoing(event, Date.parse('2026-10-09T13:00:00Z'))).toBe(false);
    expect(isPast(event, Date.parse('2026-10-09T13:00:00Z'))).toBe(true);
  });
});
