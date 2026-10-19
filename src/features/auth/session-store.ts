import { toast } from 'sonner';
import { configureApi } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import type { AuthResponse, User } from '@/lib/types';

export interface Session {
  token: string;
  user: User;
  expiresAt: number;
}

const STORAGE_KEY = 'afisha.session';

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function persist(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Приватный режим: сессия живёт до перезагрузки страницы.
  }
}

// Сессия живёт вне React, чтобы api() видел токен уже с первого запроса.
let current = readStoredSession();
const listeners = new Set<() => void>();

export const sessionStore = {
  get: (): Session | null => current,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  set(next: Session | null) {
    const identityChanged = current?.user.id !== next?.user.id;
    current = next;
    persist(next);
    // Карточки, «мои события» и очередь модерации зависят от того, кто смотрит.
    if (identityChanged) queryClient.removeQueries();
    for (const listener of listeners) listener();
  },

  start(response: AuthResponse): User {
    sessionStore.set({
      token: response.accessToken,
      user: response.user,
      expiresAt: Date.now() + response.expiresIn * 1000,
    });
    return response.user;
  },
};

/** Подключает токен сессии к api() и разлогинивает, когда сервер ответил 401. */
export function connectApiToSession() {
  configureApi({
    getToken: () => (current && current.expiresAt > Date.now() ? current.token : null),
    onUnauthorized: (error) => {
      sessionStore.set(null);
      toast.error(error.code === 'TOKEN_EXPIRED' ? 'Сессия истекла' : 'Нужно войти заново', {
        description: 'Войдите, чтобы продолжить.',
      });
    },
  });
}
