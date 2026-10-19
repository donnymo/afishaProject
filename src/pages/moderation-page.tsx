import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { EyeOffIcon, InboxIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { PageContainer, PageHeader } from '@/components/page';
import { SimplePager } from '@/components/simple-pager';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { moderationCountsQuery, moderationQuery, type ModerationParams } from '@/features/events/api';
import { HideEventDialog } from '@/features/events/components/hide-event-dialog';
import { useTabPage } from '@/hooks/use-tab-page';
import { fmtPrice, fmtRange } from '@/lib/format';
import type { EventItem } from '@/lib/types';

type Tab = ModerationParams['status'];

const TABS: { value: Tab; label: string }[] = [
  { value: 'published', label: 'Опубликованные' },
  { value: 'hidden', label: 'Скрытые' },
];
const TAB_VALUES = TABS.map((t) => t.value);
const PAGE_SIZE = 20;

export function ModerationPage() {
  const { tab, page, go } = useTabPage(TAB_VALUES, 'published');

  const [target, setTarget] = useState<EventItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const list = useQuery(moderationQuery({ status: tab, page, pageSize: PAGE_SIZE }));
  const counts = useQuery(moderationCountsQuery).data;

  const askHide = (event: EventItem) => {
    setTarget(event);
    setDialogOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Модерация"
        description="Опубликованные карточки всех организаторов. Скрытая карточка пропадает из афиши, организатор видит причину."
      />

      <Tabs value={tab} onValueChange={(value) => go({ tab: value as Tab })}>
        <TabsList className="h-10!">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-3">
              {t.label} <span className="text-muted-foreground tabular-nums">{counts?.[t.value] ?? ''}</span>
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
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={InboxIcon} title={tab === 'hidden' ? 'Скрытых карточек нет' : 'Опубликованных карточек нет'}>
          Здесь появятся события, когда организаторы их опубликуют.
        </EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 pl-4">Событие</TableHead>
                  <TableHead>Организатор</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead className="pr-4 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="min-w-[260px] py-3 pl-4 whitespace-normal">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-[13px] text-muted-foreground">{event.venue?.name}</div>
                      <HiddenReason event={event} className="mt-0.5" />
                    </TableCell>
                    <TableCell className="py-3">{event.owner.name}</TableCell>
                    <TableCell className="py-3 tabular-nums">{fmtRange(event.startsAt, event.endsAt)}</TableCell>
                    <TableCell className="py-3 tabular-nums">{fmtPrice(event.price)}</TableCell>
                    <TableCell className="py-2.5 pr-4 text-right">
                      <Link to={`/events/${event.id}`} className={cn(buttonVariants({ variant: 'ghost' }), 'h-9 px-3')}>
                        Открыть
                      </Link>
                      {tab === 'published' && (
                        <Button variant="outline" className="h-9 px-3" onClick={() => askHide(event)}>
                          <EyeOffIcon />
                          Скрыть
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:hidden">
            {list.data.items.map((event) => (
              <article key={event.id} className="flex flex-col gap-2 rounded-2xl border p-4">
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {fmtRange(event.startsAt, event.endsAt)} · {fmtPrice(event.price)}
                </span>
                <h2 className="text-base leading-snug font-semibold">{event.title}</h2>
                <span className="text-[13px] text-muted-foreground">
                  {event.owner.name} · {event.venue?.name}
                </span>
                <HiddenReason event={event} />
                <div className="mt-1 flex gap-2">
                  <Link
                    to={`/events/${event.id}`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'h-11 flex-1')}
                  >
                    Открыть
                  </Link>
                  {tab === 'published' && (
                    <Button variant="outline" className="h-11 flex-1 text-destructive" onClick={() => askHide(event)}>
                      Скрыть
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <SimplePager page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={(p) => go({ page: p })} />
        </>
      )}

      <HideEventDialog event={target} open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageContainer>
  );
}

function HiddenReason({ event, className }: { event: EventItem; className?: string }) {
  if (!event.hiddenReason) return null;
  return <div className={cn('text-[13px] text-destructive', className)}>Причина: {event.hiddenReason}</div>;
}
