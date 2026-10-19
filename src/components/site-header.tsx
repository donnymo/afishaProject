import { LockIcon, LogOutIcon, TicketIcon } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router';
import { cn } from 'cn';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import type { Role } from '@/lib/types';

const NAV: { to: string; label: string; role?: Role; end?: boolean }[] = [
  { to: '/', label: 'Афиша', end: true },
  { to: '/my', label: 'Мои события', role: 'organizer' },
  { to: '/moderation', label: 'Модерация', role: 'moderator' },
  { to: '/about', label: 'Как устроено' },
];

const initials = (name: string) =>
  name
    .replace(/[«»"]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function NavItems({ role }: { role?: Role }) {
  return (
    <>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors',
              isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )
          }
        >
          {item.label}
          {item.role && item.role !== role && <LockIcon className="size-3 opacity-60" aria-label="нужна другая роль" />}
        </NavLink>
      ))}
    </>
  );
}

export function SiteHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-7 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight whitespace-nowrap">
          <span className="grid size-[30px] place-items-center rounded-lg bg-primary text-primary-foreground">
            <TicketIcon className="size-4" />
          </span>
          Афиша Москвы
        </Link>

        <nav aria-label="Разделы" className="hidden gap-1 md:flex">
          <NavItems role={user?.role} />
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          {user ? (
            <>
              <span className="hidden h-6 items-center rounded-full bg-muted px-2.5 font-mono text-xs text-muted-foreground sm:inline-flex">
                {user.role}
              </span>
              <span
                title={`${user.name} · ${user.email}`}
                className="grid size-9 place-items-center rounded-full bg-muted text-[13px] font-semibold"
              >
                {initials(user.name)}
              </span>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Выйти"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOutIcon />
              </Button>
            </>
          ) : (
            <Link to="/login" className={cn(buttonVariants(), 'h-10 px-4')}>
              Войти
            </Link>
          )}
        </div>
      </div>

      <nav aria-label="Разделы" className="flex [scrollbar-width:none] gap-1 overflow-x-auto px-3 pb-2.5 md:hidden">
        <NavItems role={user?.role} />
      </nav>
    </header>
  );
}
