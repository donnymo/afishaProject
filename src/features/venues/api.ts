import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Venue } from '@/lib/types';

export const venuesQuery = queryOptions({
  queryKey: ['venues'],
  queryFn: ({ signal }) => api<Venue[]>('/venues', { signal }),
});

export interface VenuePayload {
  name: string;
  address: string;
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: VenuePayload) => api<Venue>('/venues', { method: 'POST', body }),
    onSuccess: (venue) => {
      queryClient.setQueryData(venuesQuery.queryKey, (venues = []) =>
        [...venues, venue].toSorted((a, b) => a.name.localeCompare(b.name, 'ru')),
      );
    },
  });
}
