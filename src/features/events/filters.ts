import { addDays, moscowDate } from '@/lib/format';
import { readPage } from '@/lib/pagination';
import { DEFAULT_CITY } from '@/lib/types';
import type { PublicEventsParams } from './api';

export const DEFAULT_SORT = 'date_asc';
export const DEFAULT_PAGE_SIZE = '12';
export const PAGE_SIZES = ['6', '12', '24', '48'];

export const SORT_OPTIONS = [
  { value: 'date_asc', label: 'Сначала ближайшие' },
  { value: 'date_desc', label: 'Сначала поздние' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
];

/** Фильтры афиши в том виде, как они лежат в URL. */
export interface EventFilters {
  from: string;
  to: string;
  categories: string[];
  minPrice: string;
  maxPrice: string;
  sort: string;
  page: number;
  pageSize: string;
}

/** Изменение URL-параметров: null или '' удаляет параметр. */
export type FiltersPatch = Record<string, string | null>;

export function readFilters(params: URLSearchParams): EventFilters {
  return {
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    categories: (params.get('category') ?? '').split(',').filter(Boolean),
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    sort: params.get('sort') ?? DEFAULT_SORT,
    page: readPage(params),
    pageSize: params.get('pageSize') ?? DEFAULT_PAGE_SIZE,
  };
}

export function toApiParams(filters: EventFilters): PublicEventsParams {
  const [sort, order] = filters.sort.split('_');
  return {
    from: filters.from,
    to: filters.to,
    category: filters.categories.join(','),
    city: DEFAULT_CITY,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort,
    order,
    page: filters.page,
    pageSize: Number(filters.pageSize),
  };
}

/** Сколько фильтров включено: для бейджа на кнопке «Фильтры» и кнопки «Сбросить». */
export function countActive(filters: EventFilters) {
  return (
    (filters.from || filters.to ? 1 : 0) + filters.categories.length + (filters.minPrice || filters.maxPrice ? 1 : 0)
  );
}

export function applyPatch(params: URLSearchParams, patch: FiltersPatch, { keepPage = false } = {}) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
  }
  if (!keepPage) next.delete('page');
  return next;
}

export interface DatePreset {
  key: string;
  label: string;
  from: string;
  to: string;
}

/** Быстрые диапазоны дат по московскому календарю. */
export function datePresets(now: Date): DatePreset[] {
  const today = moscowDate(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 — воскресенье
  const isSunday = weekday === 0;
  const daysToSaturday = 6 - weekday;

  return [
    { key: 'today', label: 'Сегодня', from: today, to: today },
    {
      key: 'weekend',
      label: 'Выходные',
      from: isSunday ? today : moscowDate(addDays(now, daysToSaturday)),
      to: isSunday ? today : moscowDate(addDays(now, daysToSaturday + 1)),
    },
    { key: 'week', label: '7 дней', from: today, to: moscowDate(addDays(now, 6)) },
    { key: 'month', label: 'Месяц', from: today, to: moscowDate(addDays(now, 30)) },
  ];
}
