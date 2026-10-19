import { LockIcon, ShieldIcon } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router';
import { cn } from 'cn';
import { EmptyState } from '@/components/empty-state';
import { PageContainer } from '@/components/page';
import { buttonVariants } from '@/components/ui/button';
import type { Role } from '@/lib/types';
import { useAuth } from './auth-context';

const RoleCode = ({ children }: { children: string }) => (
  <code className="rounded bg-muted px-1.5 font-mono text-xs">{children}</code>
);

/** Layout-маршрут для раздела одной роли: без входа — экран 401, с другой ролью — 403. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role === role) return <Outlet />;

  return (
    <PageContainer>
      {user ? (
        <EmptyState
          icon={ShieldIcon}
          code="403 · FORBIDDEN_ROLE"
          title="Недостаточно прав"
          action={
            <Link to="/" className={cn(buttonVariants({ variant: 'outline' }), 'h-10 px-4')}>
              На афишу
            </Link>
          }
        >
          Раздел доступен роли <RoleCode>{role}</RoleCode>. Ваша роль — <RoleCode>{user.role}</RoleCode>.
        </EmptyState>
      ) : (
        <EmptyState
          icon={LockIcon}
          code="401 · UNAUTHORIZED"
          title="Войдите, чтобы открыть раздел"
          action={
            <Link to="/login" state={{ from: location.pathname }} className={cn(buttonVariants(), 'h-10 px-4')}>
              Войти
            </Link>
          }
        >
          Сессия истекла или вы ещё не входили.
        </EmptyState>
      )}
    </PageContainer>
  );
}
