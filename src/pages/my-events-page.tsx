import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { CalendarPlusIcon, PlusIcon, SendIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { PageContainer, PageHeader } from '@/components/page';
import { SimplePager } from '@/components/simple-pager';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/auth-context';
import { myEventCountsQuery, myEventsQuery, usePublishEvent } from '@/features/events/api';
import { StatusBadge } from '@/features/events/components/status-badge';
import { readinessChecks, readinessOf } from '@/features/events/readiness';
import { useNow } from '@/hooks/use-now';
import { useTabPage } from '@/hooks/use-tab-page';
import type { ApiError } from '@/lib/api';
import { fmtPrice, fmtRange, isOngoing, isPast } from '@/lib/format';
import type { EventItem, EventStatus } from '@/lib/types';

type Tab = 'all' | EventStatus;

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'draft', label: 'Черновики' },
  { value: 'published', label: 'Опубликованные' },
  { value: 'hidden', label: 'Скрытые' },
  { value: 'archived', label: 'Архив' },
];
const PAGE_SIZE = 20;

const TAB_VALUES = TABS.map((t) => t.value);

const statusOf = (tab: Tab) => (tab === 'all' ? undefined : tab);

export function MyEventsPage() {
  const { user } = useAuth();
  const now = useNow();
  const { tab, page, go } = useTabPage(TAB_VALUES, 'all');

  const list = useQuery(myEventsQuery({ status: statusOf(tab), page, pageSize: PAGE_SIZE }));
  const counts = useQuery(myEventCountsQuery).data;

  const publish = usePublishEvent();
  const [publishError, setPublishError] = useState<{ event: EventItem; error: ApiError } | null>(null);

  const publishEvent = (event: EventItem) => {
    setPublishError(null);
    publish.mutate(event.id, {
      onSuccess: () => toast.success('Опубликовано', { description: 'Карточка появилась в афише' }),
      onError: (error) => setPublishError({ event, error }),
    });
  };

  const rowProps = (event: EventItem) => ({
    event,
    now,
    publishing: publish.isPending && publish.variables === event.id,
    onPublish: () => publishEvent(event),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Мои события"
        description={`${user?.name} · здесь только карточки, где вы владелец.`}
        actions={
          <Link to="/my/new" className={cn(buttonVariants(), 'h-11 w-full gap-2 px-4 sm:w-auto')}>
            <PlusIcon />
            Новое событие
          </Link>
        }
      />

      {publishError && (
        <ErrorAlert
          error={publishError.error}
          title={`Не удалось опубликовать «${publishError.event.title}»`}
          action={
            <Link
              to={`/my/${publishError.event.id}/edit`}
              className={cn(buttonVariants({ variant: 'outline' }), 'h-9 border-destructive/30 text-destructive')}
            >
              Заполнить поля
            </Link>
          }
        />
      )}

      <Tabs value={tab} onValueChange={(value) => go({ tab: value as Tab })}>
        <TabsList className="h-10! max-w-full justify-start overflow-x-auto overflow-y-hidden">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-none px-3">
              {t.label}
              <span className="text-muted-foreground tabular-nums">{counts?.[t.value] ?? ''}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.isError ? (
        <ErrorAlert
          error={list.error}
          action={
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Повторить
            </Button>
          }
        />
      ) : list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={CalendarPlusIcon}
          title={tab === 'all' ? 'Событий пока нет' : 'В этом статусе пусто'}
          action={
            tab === 'all' && (
              <Link to="/my/new" className={cn(buttonVariants(), 'h-10 px-4')}>
                Создать первое событие
              </Link>
            )
          }
        >
          {tab === 'all'
            ? 'Создайте черновик: его можно заполнять постепенно и опубликовать, когда всё будет готово.'
            : 'Переключитесь на другую вкладку.'}
        </EmptyState>
      ) : (
        <>
          {/* Таблица на широких экранах */}
          <div className="hidden overflow-x-auto rounded-2xl border xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 pl-4">Событие</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Площадка</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="pr-4 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="min-w-[260px] py-3.5 pl-4 align-top whitespace-normal">
                      <div className="font-medium">{event.title}</div>
                      <RowNote event={event} now={now} />
                    </TableCell>
                    <TableCell className="py-3.5 align-top tabular-nums">
                      {fmtRange(event.startsAt, event.endsAt)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'py-3.5 align-top whitespace-normal',
                        !event.venue && 'text-amber-700 dark:text-amber-400',
                      )}
                    >
                      {event.venue?.name ?? 'Не выбрана'}
                    </TableCell>
                    <TableCell className="py-3.5 align-top tabular-nums">{fmtPrice(event.price)}</TableCell>
                    <TableCell className="py-3.5 align-top">
                      <StatusBadge status={event.status} past={isPast(event, now)} />
                    </TableCell>
                    <TableCell className="py-2.5 pr-4 text-right align-top">
                      <RowActions {...rowProps(event)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Карточки на телефоне */}
          <div className="grid gap-2.5 sm:grid-cols-2 xl:hidden">
            {list.data.items.map((event) => (
              <article key={event.id} className="flex flex-col gap-2.5 rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-2.5">
                  <span className="text-[13px] text-muted-foreground tabular-nums">
                    {fmtRange(event.startsAt, event.endsAt)}
                  </span>
                  <StatusBadge status={event.status} past={isPast(event, now)} />
                </div>
                <h2 className="text-base leading-snug font-semibold">{event.title}</h2>
                <div className="flex justify-between gap-2 text-[13px]">
                  <span className={cn(!event.venue && 'text-amber-700 dark:text-amber-400')}>
                    {event.venue?.name ?? 'Площадка не выбрана'}
                  </span>
                  <b className="font-semibold whitespace-nowrap">{fmtPrice(event.price)}</b>
                </div>
                <RowNote event={event} now={now} />
                <div className="flex gap-2 [&>*]:h-11 [&>*]:flex-1">
                  <RowActions {...rowProps(event)} />
                </div>
              </article>
            ))}
          </div>

          <SimplePager page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={(p) => go({ page: p })} />
        </>
      )}

      <p className="text-[13px] text-muted-foreground">
        Статус меняется только кнопкой «Опубликовать». Скрыть карточку может модератор, причина появится в строке
        события. Закончившиеся события сами переходят в архив.
      </p>
    </PageContainer>
  );
}

function RowNote({ event, now }: { event: EventItem; now: number }) {
  if (event.status === 'hidden') {
    return <div className="mt-0.5 text-[13px] text-destructive">Скрыто модератором: {event.hiddenReason}</div>;
  }
  if (event.status === 'published' && isOngoing(event, now)) {
    return (
      <div className="mt-0.5 text-[13px] text-muted-foreground">
        Идёт сейчас: начало нельзя перенести на более раннее время
      </div>
    );
  }
  if (event.status !== 'draft') return null;

  // Те же правила, что сервер проверяет при публикации.
  const missing = readinessChecks(readinessOf(event), now)
    .filter((check) => !check.ok)
    .map((check) => check.missing);

  return missing.length ? (
    <div className="mt-0.5 text-[13px] text-amber-700 dark:text-amber-400">Не заполнено: {missing.join(', ')}</div>
  ) : (
    <div className="mt-0.5 text-[13px] text-emerald-700 dark:text-emerald-400">Готово к публикации</div>
  );
}

function RowActions({
  event,
  now,
  publishing,
  onPublish,
}: {
  event: EventItem;
  now: number;
  publishing: boolean;
  onPublish: () => void;
}) {
  const readOnly = event.status === 'hidden' || event.status === 'archived' || isPast(event, now);
  return (
    <>
      <Link
        to={readOnly ? `/events/${event.id}` : `/my/${event.id}/edit`}
        className={cn(buttonVariants({ variant: 'ghost' }), 'h-9 px-3 max-xl:border max-xl:border-border')}
      >
        {readOnly ? 'Открыть' : 'Изменить'}
      </Link>
      {event.status === 'draft' && (
        <Button className="h-9 px-3" onClick={onPublish} disabled={publishing}>
          <SendIcon />
          {publishing ? 'Публикуем…' : 'Опубликовать'}
        </Button>
      )}
    </>
  );
}
