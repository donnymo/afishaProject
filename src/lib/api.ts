import type { ErrorDetail } from './types';

/** Ошибка API в едином формате { code, message, details, requestId }. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetail[];
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = [], requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** Сообщения об ошибках по полям формы: первое сообщение на каждое поле. */
  fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const detail of this.details) {
      if (detail.field && !result[detail.field]) result[detail.field] = detail.issue;
    }
    return result;
  }
}

type QueryValue = string | number | undefined | null;
export type QueryParams = Record<string, QueryValue>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
}

interface ApiHooks {
  getToken: () => string | null;
  onUnauthorized: (error: ApiError) => void;
}

let hooks: ApiHooks = { getToken: () => null, onUnauthorized: () => {} };

/** Подключает хранилище токена. Вызывается один раз при старте приложения. */
export function configureApi(next: ApiHooks) {
  hooks = next;
}

export function buildQuery(query: QueryParams = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Запрос к API через прокси /api. Любая ошибка, кроме отмены, приводится к ApiError. */
export async function api<T>(path: string, { method = 'GET', body, query, signal }: RequestOptions = {}): Promise<T> {
  const token = hooks.getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`/api${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Сервер недоступен. Проверьте, что API запущен, и попробуйте ещё раз.');
  }

  const text = await response.text();
  const data = text ? parseJson(text) : null;

  if (!response.ok) {
    const payload = (data ?? {}) as Partial<{
      code: string;
      message: string;
      details: ErrorDetail[];
      requestId: string;
    }>;
    const error = new ApiError(
      response.status,
      payload.code ?? 'HTTP_ERROR',
      payload.message ?? `Ошибка ${response.status}`,
      payload.details ?? [],
      payload.requestId,
    );
    if (response.status === 401 && token) hooks.onUnauthorized(error);
    throw error;
  }

  return data as T;
}
