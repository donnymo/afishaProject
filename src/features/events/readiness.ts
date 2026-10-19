import type { EventItem, EventStatus } from '@/lib/types';

/** Поля, которые сервер проверяет при публикации (server/events/event-rules.ts). */
export interface ReadinessInput {
  status: EventStatus;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  price: number | null;
  ageLimit: number | null;
  venueId: string | null;
  categoryCount: number;
}

export interface ReadinessCheck {
  key: string;
  /** Пункт чек-листа в редакторе. */
  label: string;
  /** Короткое название для строки «Не заполнено: …». */
  missing: string;
  ok: boolean;
}

export function readinessChecks(input: ReadinessInput, now: number): ReadinessCheck[] {
  const start = input.startsAt ? new Date(input.startsAt).getTime() : null;
  const end = input.endsAt ? new Date(input.endsAt).getTime() : null;
  // У опубликованного события, которое уже идёт, начало законно в прошлом.
  const startOk = start !== null && (input.status !== 'draft' || start > now);

  return [
    { key: 'title', label: 'Название', missing: 'название', ok: input.title.trim().length >= 3 },
    { key: 'description', label: 'Описание', missing: 'описание', ok: !!input.description?.trim() },
    {
      key: 'startsAt',
      label: 'Некорректное начало',
      missing: start === null ? 'начало' : 'некорректное начало',
      ok: startOk,
    },
    {
      key: 'endsAt',
      label: 'Окончание позже начала',
      missing: end === null ? 'окончание' : 'окончание позже начала',
      ok: start !== null && end !== null && end > start,
    },
    { key: 'venueId', label: 'Площадка из справочника', missing: 'площадка', ok: !!input.venueId },
    { key: 'price', label: 'Цена', missing: 'цена', ok: input.price !== null },
    { key: 'ageLimit', label: 'Возрастное ограничение', missing: 'возраст', ok: input.ageLimit !== null },
    { key: 'categoryIds', label: 'Хотя бы одна категория', missing: 'категория', ok: input.categoryCount > 0 },
  ];
}

export const readinessOf = (event: EventItem): ReadinessInput => ({
  status: event.status,
  title: event.title,
  description: event.description,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  price: event.price,
  ageLimit: event.ageLimit,
  venueId: event.venue?.id ?? null,
  categoryCount: event.categories.length,
});
