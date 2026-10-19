import { useMutation } from '@tanstack/react-query';
import { cn } from 'cn';
import { InfoIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/auth-context';
import type { Role, User } from '@/lib/types';

type Mode = 'login' | 'register';

// Демо-аккаунты из prisma/seed-data.ts — только для локального стенда.
const DEMO_PASSWORD = 'demo-pass-2026';
const DEMO_ACCOUNTS: { initials: string; name: string; email: string; role: Role }[] = [
  { initials: 'СР', name: 'Студия «Резонанс»', email: 'organizer@afisha.local', role: 'organizer' },
  { initials: 'КС', name: 'КЦ «Сокол»', email: 'sokol@afisha.local', role: 'organizer' },
  { initials: 'ИК', name: 'Ирина К.', email: 'moderator@afisha.local', role: 'moderator' },
];

const homeOf = (user: User) => (user.role === 'moderator' ? '/moderation' : '/my');

export function LoginPage() {
  const { user, login, register } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = useMutation({
    mutationFn: () => (mode === 'register' ? register(name, email, password) : login(email, password)),
  });

  // После входа сессия появляется в контексте, и страница сама уводит пользователя дальше.
  if (user) return <Navigate to={from ?? homeOf(user)} replace />;

  const fieldErrors = signIn.error?.fieldErrors() ?? {};
  const isRegister = mode === 'register';

  const switchMode = (next: Mode) => {
    setMode(next);
    signIn.reset();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signIn.mutate();
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-muted/40">
      <div className="mx-auto flex max-w-[880px] flex-wrap items-start justify-center gap-6 px-4 pt-6 pb-12 md:pt-16 md:pb-20">
        <section className="flex w-full max-w-[440px] flex-[1_1_360px] flex-col gap-5 rounded-2xl border bg-card p-6 shadow-xs">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{isRegister ? 'Регистрация организатора' : 'Вход'}</h1>
            <p className="text-muted-foreground">
              {isRegister
                ? 'Публикуйте события своей площадки или коллектива.'
                : 'Войдите, чтобы управлять своими событиями.'}
            </p>
          </div>

          <Tabs value={mode} onValueChange={(value) => switchMode(value as Mode)}>
            <TabsList className="grid h-10! w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            {signIn.error && <ErrorAlert error={signIn.error} />}
            {isRegister && (
              <Field>
                <FieldLabel htmlFor="a-name">Название организации</FieldLabel>
                <Input
                  id="a-name"
                  className="h-11"
                  placeholder="Например, Студия «Резонанс»"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={!!fieldErrors.name}
                  autoComplete="organization"
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="a-email">Email</FieldLabel>
              <Input
                id="a-email"
                type="email"
                className="h-11"
                placeholder="you@example.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                autoComplete="username"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="a-pass">Пароль</FieldLabel>
              <Input
                id="a-pass"
                type="password"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              {isRegister && <FieldDescription className="text-[13px]">Минимум 8 символов.</FieldDescription>}
            </Field>
            {isRegister && (
              <div className="flex gap-2.5 rounded-xl bg-muted px-3.5 py-3 text-[13px] text-muted-foreground">
                <InfoIcon className="mt-0.5 size-4 shrink-0" />
                <span>Новый аккаунт получает роль организатора: можно создавать и публиковать свои события.</span>
              </div>
            )}
            <Button type="submit" className="h-11" disabled={signIn.isPending}>
              {signIn.isPending ? 'Подождите…' : isRegister ? 'Создать аккаунт' : 'Войти'}
            </Button>
          </form>
        </section>

        <section className="flex w-full max-w-[380px] flex-[1_1_300px] flex-col gap-4 rounded-2xl border bg-card p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Демо-аккаунты</h2>
            <p className="text-[13px] text-muted-foreground">
              Созданы seed-скриптом. Пароль у всех:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs select-all">{DEMO_PASSWORD}</code>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  switchMode('login');
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                  {account.initials}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="font-semibold">{account.name}</b>
                  <span className="truncate text-[13px] text-muted-foreground">{account.email}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 font-mono text-[11.5px]',
                    account.role === 'moderator'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {account.role}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
