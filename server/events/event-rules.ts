import type { ErrorDetail } from '../common/errors/app-exception.js';

/** Возрастные ограничения по закону о защите детей (436-ФЗ). */
export const AGE_LIMITS = [0, 6, 12, 16, 18];
export const MAX_PRICE = 1_000_000;
export const SORT_FIELDS = ['date', 'price'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * Часовой пояс города: даты без времени в фильтре считаются по нему.
 * Москва живёт без перехода на летнее время, а фронтенд тоже считает в +03:00,
 * поэтому это доменная константа, а не настройка окружения.
 */
export const CITY_UTC_OFFSET = '+03:00';

export interface PublishableFields {
  title: string;
  description: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  price: number | null;
  ageLimit: number | null;
  city: string;
  venueId: string | null;
  venueExists: boolean;
  categoryCount: number;
}

/**
 * Что мешает событию быть опубликованным. Пустой список — можно публиковать.
 * requireFutureStart: для публикации черновика начало должно быть впереди;
 * у уже опубликованного события, которое идёт, начало законно в прошлом.
 */
export function readinessIssues(e: PublishableFields, now: Date, opts: { requireFutureStart: boolean }): ErrorDetail[] {
  const issues: ErrorDetail[] = [];
  if (!e.title.trim()) issues.push({ field: 'title', issue: 'Не заполнено название' });
  if (!e.description?.trim()) issues.push({ field: 'description', issue: 'Не заполнено описание' });
  if (!e.startsAt) issues.push({ field: 'startsAt', issue: 'Не указано начало' });
  if (!e.endsAt) issues.push({ field: 'endsAt', issue: 'Не указано окончание' });
  issues.push(...rangeIssues(e.startsAt, e.endsAt));
  if (opts.requireFutureStart && e.startsAt && e.startsAt <= now)
    issues.push({ field: 'startsAt', issue: 'Начало уже прошло' });
  if (e.price === null) issues.push({ field: 'price', issue: 'Не указана цена (0 — бесплатно)' });
  if (e.ageLimit === null) issues.push({ field: 'ageLimit', issue: 'Не указано возрастное ограничение' });
  if (!e.city) issues.push({ field: 'city', issue: 'Не указан город' });
  if (!e.venueId) issues.push({ field: 'venueId', issue: 'Не выбрана площадка' });
  else if (!e.venueExists) issues.push({ field: 'venueId', issue: 'Площадка не найдена' });
  if (e.categoryCount === 0) issues.push({ field: 'categoryIds', issue: 'Нужна хотя бы одна категория' });
  return issues;
}

/** Окончание раньше начала недопустимо даже у черновика. */
export function rangeIssues(startsAt: Date | null, endsAt: Date | null): ErrorDetail[] {
  return startsAt && endsAt && endsAt <= startsAt
    ? [{ field: 'endsAt', issue: 'Окончание должно быть позже начала' }]
    : [];
}

/** Дата без времени → граница дня в часовом поясе города; с временем — как есть. */
export function parseBoundary(value: string, edge: 'start' | 'end'): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}${CITY_UTC_OFFSET}`);
  }
  return new Date(value);
}
