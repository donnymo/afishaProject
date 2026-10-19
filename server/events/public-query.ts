import type { ErrorDetail } from '../common/errors/app-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { EventStatus } from '../generated/prisma/enums.js';
import type { ListEventsQueryDto } from './events.dto.js';
import { parseBoundary } from './event-rules.js';

/** Проверки, которые затрагивают несколько параметров сразу. */
export function crossFieldIssues(q: ListEventsQueryDto): ErrorDetail[] {
  const issues: ErrorDetail[] = [];
  if (q.from && q.to && parseBoundary(q.from, 'start') > parseBoundary(q.to, 'end')) {
    issues.push({ field: 'to', issue: 'Дата «по» раньше даты «с»' });
  }
  if (q.minPrice !== undefined && q.maxPrice !== undefined && q.minPrice > q.maxPrice) {
    issues.push({ field: 'maxPrice', issue: 'minPrice больше maxPrice' });
  }
  return issues;
}

/**
 * Собирает Prisma-запрос публичной выдачи только из уже провалидированных
 * параметров. Публике видны опубликованные события, которые ещё не закончились.
 */
export function buildPublicEventsQuery(q: ListEventsQueryDto, categoryIds: string[] | undefined, now: Date) {
  const from = q.from ? parseBoundary(q.from, 'start') : undefined;
  const to = q.to ? parseBoundary(q.to, 'end') : undefined;
  const endsAfter = from && from > now ? from : now;

  const where: Prisma.EventWhereInput = {
    status: EventStatus.published,
    // Событие попадает в диапазон, если пересекается с ним: ещё не закончилось к from и началось до to.
    endsAt: { gte: endsAfter },
    ...(to && { startsAt: { lte: to } }),
    ...(q.city && { city: q.city }),
    ...(categoryIds && { categories: { some: { id: { in: categoryIds } } } }),
    ...((q.minPrice !== undefined || q.maxPrice !== undefined) && {
      price: {
        ...(q.minPrice !== undefined && { gte: q.minPrice }),
        ...(q.maxPrice !== undefined && { lte: q.maxPrice }),
      },
    }),
  };

  // Вторичные ключи делают порядок стабильным, иначе offset-страницы могут терять и дублировать записи.
  const orderBy: Prisma.EventOrderByWithRelationInput[] =
    q.sort === 'price'
      ? [{ price: q.order }, { startsAt: 'asc' }, { id: 'asc' }]
      : [{ startsAt: q.order }, { id: 'asc' }];

  return { where, orderBy };
}
