import type { Prisma } from '../generated/prisma/client.js';
import type { EventDto } from './events.dto.js';

export const EVENT_INCLUDE = {
  venue: { select: { id: true, name: true, address: true } },
  categories: { select: { id: true, slug: true, name: true }, orderBy: { name: 'asc' } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.EventInclude;

export type EventWithRelations = Prisma.EventGetPayload<{ include: typeof EVENT_INCLUDE }>;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** withModeration: причину скрытия видят только владелец и модератор. */
export function toEventDto(e: EventWithRelations, withModeration: boolean): EventDto {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: iso(e.startsAt),
    endsAt: iso(e.endsAt),
    price: e.price,
    ageLimit: e.ageLimit,
    city: e.city,
    status: e.status,
    venue: e.venue,
    categories: e.categories,
    owner: e.owner,
    publishedAt: iso(e.publishedAt),
    ...(withModeration && { hiddenReason: e.hiddenReason, hiddenAt: iso(e.hiddenAt) }),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
