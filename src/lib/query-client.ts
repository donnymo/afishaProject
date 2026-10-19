import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}

const MAX_RETRIES = 2;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Ошибку 4xx повтор не исправит, поэтому показываем её сразу. Повторяем только сетевые ошибки и 5xx.
      retry: (failureCount, error) =>
        failureCount < MAX_RETRIES && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});
