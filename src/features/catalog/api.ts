import { queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';

/** Справочник категорий меняется только миграциями, поэтому кэшируется на всю сессию. */
export const categoriesQuery = queryOptions({
  queryKey: ['categories'],
  queryFn: ({ signal }) => api<Category[]>('/categories', { signal }),
  staleTime: Infinity,
});
