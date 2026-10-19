import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type QueryParams } from '@/lib/api';
import type { EventItem, EventStatus, ModerationCounts, MyEventCounts, Page } from '@/lib/types';

export interface PublicEventsParams extends QueryParams {
  from?: string;
  to?: string;
  category?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  sort: string;
  order: string;
  page: number;
  pageSize: number;
}

export interface MyEventsParams extends QueryParams {
  status?: EventStatus;
  page: number;
  pageSize: number;
}

export interface ModerationParams extends QueryParams {
  status: Extract<EventStatus, 'published' | 'hidden'>;
  page: number;
  pageSize: number;
}

/** Ключи кэша: любая мутация события инвалидирует все списки разом через eventKeys.lists(). */
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  public: (params: PublicEventsParams) => [...eventKeys.lists(), 'public', params] as const,
  mine: (params: MyEventsParams) => [...eventKeys.lists(), 'mine', params] as const,
  moderation: (params: ModerationParams) => [...eventKeys.lists(), 'moderation', params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
};

export const publicEventsQuery = (params: PublicEventsParams) =>
  queryOptions({
    queryKey: eventKeys.public(params),
    queryFn: ({ signal }) => api<Page<EventItem>>('/events', { query: params, signal }),
    // При смене фильтров старые результаты остаются на экране, пока грузятся новые.
    placeholderData: keepPreviousData,
  });

export const myEventsQuery = (params: MyEventsParams) =>
  queryOptions({
    queryKey: eventKeys.mine(params),
    queryFn: ({ signal }) => api<Page<EventItem>>('/events/mine', { query: params, signal }),
  });

export const moderationQuery = (params: ModerationParams) =>
  queryOptions({
    queryKey: eventKeys.moderation(params),
    queryFn: ({ signal }) => api<Page<EventItem>>('/events/moderation', { query: params, signal }),
  });

export const myEventCountsQuery = queryOptions({
  queryKey: [...eventKeys.lists(), 'mine', 'counts'] as const,
  queryFn: ({ signal }) => api<MyEventCounts>('/events/mine/counts', { signal }),
});

export const moderationCountsQuery = queryOptions({
  queryKey: [...eventKeys.lists(), 'moderation', 'counts'] as const,
  queryFn: ({ signal }) => api<ModerationCounts>('/events/moderation/counts', { signal }),
});

export const eventQuery = (id: string) =>
  queryOptions({
    queryKey: eventKeys.detail(id),
    queryFn: ({ signal }) => api<EventItem>(`/events/${id}`, { signal }),
  });

export interface EventPayload {
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  price: number | null;
  ageLimit: number | null;
  city: string;
  venueId: string | null;
  categoryIds: string[];
}

/** Кладёт свежую карточку в кэш и помечает списки устаревшими. */
function useEventSaved() {
  const queryClient = useQueryClient();
  return (event: EventItem) => {
    queryClient.setQueryData(eventKeys.detail(event.id), event);
    return queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
  };
}

/** Создание черновика или правка существующего события. */
export function useSaveEvent(id: string | undefined) {
  const onSuccess = useEventSaved();
  return useMutation({
    mutationFn: (body: EventPayload) =>
      id
        ? api<EventItem>(`/events/${id}`, { method: 'PATCH', body })
        : api<EventItem>('/events', { method: 'POST', body }),
    onSuccess,
  });
}

export function usePublishEvent() {
  const onSuccess = useEventSaved();
  return useMutation({
    mutationFn: (id: string) => api<EventItem>(`/events/${id}/publish`, { method: 'POST' }),
    onSuccess,
  });
}

export function useHideEvent() {
  const onSuccess = useEventSaved();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<EventItem>(`/events/${id}/hide`, { method: 'POST', body: { reason } }),
    onSuccess,
  });
}
