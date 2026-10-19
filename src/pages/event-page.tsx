import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import {
  CalendarIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeOffIcon,
  MapPinIcon,
  PencilIcon,
  SearchXIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { PageContainer } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-context';
import { eventQuery } from '@/features/events/api';
import { HideEventDialog } from '@/features/events/components/hide-event-dialog';
import { StatusBadge } from '@/features/events/components/status-badge';
import { useNow } from '@/hooks/use-now';
import { fmtDayMonth, fmtLongDay, fmtPrice, fmtTime, isPast, moscowDate } from '@/lib/format';
import { cityName, type EventItem } from '@/lib/types';

/** «19:00–21:00» в пределах дня или «до 12 октября, 10:00–20:00» для многодневных. */
function timeLine(startsAt: string, endsAt: string | null) {
  if (endsAt && moscowDate(new Date(startsAt)) !== moscowDate(new Date(endsAt))) {
    return `до ${fmtDayMonth(endsAt)}, ${fmtTime(startsAt)}–${fmtTime(endsAt)}`;
  }
  return endsAt ? `${fmtTime(startsAt)}–${fmtTime(endsAt)}` : fmtTime(startsAt);
}

export function EventPage() {
  const { id = '' } = useParams();
  const event = useQuery(eventQuery(id));

  if (event.isPending) return <EventSkeleton />;

  if (event.isError) {
    const notFound = event.error.status === 404 || event.error.code === 'VALIDATION_FAILED';
    return (
      <PageContainer>
        {notFound ? (
          <EmptyState
            icon={SearchXIcon}
            code={`${event.error.status} · ${event.error.code}`}
            title="Событие не найдено"
            action={
              <Link to="/" className={cn(buttonVariants({ variant: 'outline' }), 'h-10 px-4')}>
                Вернуться в афишу
              </Link>
            }
          >
            Его удалили, скрыли или ещё не опубликовали.
          </EmptyState>
        ) : (
          <ErrorAlert
            error={event.error}
            action={
              <Button variant="outline" size="sm" onClick={() => void event.refetch()}>
                Повторить
              </Button>
            }
          />
        )}
      </PageContainer>
    );
  }

  return <EventDetails event={event.data} />;
}

function EventDetails({ event: e }: { event: EventItem }) {
  const { user } = useAuth();
  const now = useNow();
  const [hideOpen, setHideOpen] = useState(false);

  const isOwner = user?.id === e.owner.id;
  const isModerator = user?.role === 'moderator';
  const address = e.venue ? `${e.venue.address}, ${cityName(e.city)}` : '';
  const back = isOwner
    ? { to: '/my', label: 'Мои события' }
    : isModerator
      ? { to: '/moderation', label: 'Модерация' }
      : { to: '/', label: 'Афиша' };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Адрес скопирован');
    } catch {
      toast.error('Не удалось скопировать', { description: address });
    }
  };

  return (
    <PageContainer>
      <nav aria-label="Навигация" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link to={back.to} className="hover:text-foreground">
          {back.label}
        </Link>
        <ChevronRightIcon className="size-3.5" />
        <span className="truncate">{e.categories[0]?.name ?? 'Событие'}</span>
      </nav>

      {e.status === 'hidden' && (
        <div
          role="status"
          className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3.5 text-destructive"
        >
          <EyeOffIcon className="mt-0.5 size-4" />
          <b className="font-semibold">Скрыто модератором — публика карточку не видит</b>
          <p className="col-start-2 text-sm text-destructive/90">{e.hiddenReason}</p>
        </div>
      )}
      {e.status === 'archived' && (
        <div role="status" className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Событие завершилось и перенесено в архив: публика его больше не видит, изменить карточку нельзя.
        </div>
      )}
      {e.status === 'draft' && (
        <div role="status" className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Это черновик: его видите только вы. Опубликуйте карточку в редакторе, когда заполните все поля.
        </div>
      )}

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <aside
          aria-label="Когда и где"
          className="flex flex-col gap-4 rounded-2xl border p-5 shadow-xs md:order-2 md:w-[360px] md:shrink-0"
        >
          {e.startsAt && (
            <InfoRow
              icon={CalendarIcon}
              title={<span className="first-letter:uppercase">{fmtLongDay(e.startsAt)}</span>}
            >
              <span className="tabular-nums">{timeLine(e.startsAt, e.endsAt)}</span>
            </InfoRow>
          )}
          {e.venue && (
            <InfoRow icon={MapPinIcon} title={e.venue.name}>
              {address}
            </InfoRow>
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Цена</span>
              <span className="text-xl font-semibold tracking-tight tabular-nums">
                {fmtPrice(e.price, { from: true })}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Возраст</span>
              <span className="text-xl font-semibold tabular-nums">{e.ageLimit !== null ? `${e.ageLimit}+` : '—'}</span>
            </div>
          </div>
          {e.price !== 0 && <p className="text-[13px] text-muted-foreground">Билеты продаются в кассе площадки.</p>}
          {e.venue && (
            <Button variant="outline" className="h-11" onClick={copyAddress}>
              <CopyIcon />
              Скопировать адрес
            </Button>
          )}
          {isOwner && e.status !== 'hidden' && e.status !== 'archived' && (
            <Link to={`/my/${e.id}/edit`} className={cn(buttonVariants(), 'h-11')}>
              <PencilIcon />
              Редактировать
            </Link>
          )}
          {isModerator && e.status === 'published' && (
            <Button variant="destructive" className="h-11" onClick={() => setHideOpen(true)}>
              <EyeOffIcon />
              Скрыть событие
            </Button>
          )}
        </aside>

        <article className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {e.categories.map((category) => (
                <Badge key={category.id} variant="secondary" className="h-6 px-2.5">
                  {category.name}
                </Badge>
              ))}
              {e.ageLimit !== null && (
                <Badge variant="outline" className="h-6 px-2.5">
                  {e.ageLimit}+
                </Badge>
              )}
              {(isOwner || isModerator) && <StatusBadge status={e.status} past={isPast(e, now)} />}
            </div>
            <h1 className="max-w-[22ch] text-[28px] leading-[1.12] font-bold tracking-tight md:text-[40px]">
              {e.title}
            </h1>
            <p className="text-muted-foreground">Организатор — {e.owner.name}</p>
          </div>
          {e.description ? (
            <div className="flex max-w-[64ch] flex-col gap-3 text-base leading-relaxed whitespace-pre-line">
              {e.description}
            </div>
          ) : (
            <p className="text-muted-foreground">Описание пока не добавлено.</p>
          )}
          {e.venue && (
            <div className="flex max-w-[64ch] flex-col gap-1.5 rounded-2xl bg-muted p-4">
              <h2 className="text-[15px] font-semibold">Площадка</h2>
              <p>{e.venue.name}</p>
              <p className="text-muted-foreground">{address}</p>
            </div>
          )}
        </article>
      </div>

      {isModerator && (
        // Мутация сама кладёт обновлённую карточку в кэш: страница перерисуется со статусом «Скрыто».
        <HideEventDialog event={e} open={hideOpen} onOpenChange={setHideOpen} />
      )}
    </PageContainer>
  );
}

function InfoRow({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof CalendarIcon;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
        <Icon className="size-[18px]" />
      </span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function EventSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-72 rounded-2xl md:w-[360px]" />
      </div>
    </PageContainer>
  );
}
