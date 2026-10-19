import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { AuthResponse } from '@/lib/types';
import { AuthContext, type AuthState } from './auth-context';
import { sessionStore } from './session-store';

const logout = () => sessionStore.set(null);

const login: AuthState['login'] = async (email, password) =>
  sessionStore.start(await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }));

const register: AuthState['register'] = async (name, email, password) =>
  sessionStore.start(await api<AuthResponse>('/auth/register', { method: 'POST', body: { name, email, password } }));

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.get);

  // Разлогиниваем по истечении токена, даже если запросов не было.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(logout, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);

  const value = useMemo<AuthState>(() => ({ user: session?.user ?? null, login, register, logout }), [session]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
