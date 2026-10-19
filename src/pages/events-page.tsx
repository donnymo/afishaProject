import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { RotateCcwIcon, SearchIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { PageContainer, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { categoriesQuery } from '@/features/catalog/api';
import { publicEventsQuery } from '@/features/events/api';
import { ActiveFilterChips } from '@/features/events/components/active-filter-chips';
import { EventCard, EventCardGrid } from '@/features/events/components/event-card';
import { EventsFilters } from '@/features/events/components/events-filters';
import { EventsPagination } from '@/features/events/components/events-pagination';
import { SortSelect } from '@/features/events/components/sort-select';
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT, toApiParams } from '@/features/events/filters';
import { useEventFilters } from '@/features/events/use-event-filters';
import { useNow } from '@/hooks/use-now';
import { plural } from '@/lib/format';

const eventsCount = (total: number) => `${total} ${plural(total, 'событие', 'события', 'событий')}`;

export function EventsPage() {
  const { filters, update, reset, activeCount } = useEventFilters();
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = useNow();

  const categories = useQuery(categoriesQuery);
  const events = useQuery(publicEventsQuery(toApiParams(filters)));
  const fieldErrors = events.error?.fieldErrors() ?? {};

  const changeSort = (sort: string) => update({ sort: sort === DEFAULT_SORT ? null : sort });

  const filtersForm = (
    <EventsFilters
      filters={filters}
      onChange={update}
      categories={categories.data}
      fieldErrors={fieldErrors}
      now={now}
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title="Афиша Москвы"
        description="Концерты, спектакли, выставки и лекции, которые ещё не закончились."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          aria-label="Фильтры"
          className="hidden w-[280px] shrink-0 rounded-2xl border p-5 shadow-xs lg:sticky lg:top-24 lg:block"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold">Фильтры</h2>
            <Button variant="ghost" size="sm" onClick={reset} disabled={activeCount === 0}>
              <RotateCcwIcon />
              Сбросить
            </Button>
          </div>
          {filtersForm}
        </aside>

        <section aria-label="Результаты" className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Телефон и планшет: фильтры в выезжающей панели */}
          <div className="flex flex-col gap-3 lg:hidden">
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 flex-1 gap-2" onClick={() => setSheetOpen(true)}>
                <SlidersHorizontalIcon />
                Фильтры
                {activeCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
              <SortSelect value={filters.sort} onChange={changeSort} className="h-11 flex-1" />
            </div>
            {activeCount > 0 && <ActiveFilterChips filters={filters} categories={categories.data} onChange={update} />}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground" aria-live="polite">
              {events.data ? (
                <>
                  Найдено <b className="font-semibold text-foreground tabular-nums">{events.data.total}</b>{' '}
                  {plural(events.data.total, 'событие', 'события', 'событий')}
                </>
              ) : events.isPending ? (
                'Ищем события…'
              ) : null}
            </span>
            <SortSelect value={filters.sort} onChange={changeSort} className="hidden h-9 lg:flex" />
          </div>

          {events.isError ? (
            <ErrorAlert
              error={events.error}
              title={events.error.status === 400 ? 'Проверьте фильтры' : undefined}
              action={
                events.error.status === 400 ? (
                  <Button variant="outline" size="sm" onClick={reset}>
                    Сбросить фильтры
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => void events.refetch()}>
                    Повторить
                  </Button>
                )
              }
            />
          ) : events.isPending ? (
            <ResultsSkeleton />
          ) : events.data.items.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title="Ничего не нашлось"
              action={
                activeCount > 0 && (
                  <Button variant="outline" className="h-10 px-4" onClick={reset}>
                    Сбросить фильтры
                  </Button>
                )
              }
            >
              Под эти фильтры нет событий. Расширьте даты или уберите часть категорий.
            </EmptyState>
          ) : (
            <>
              <EventCardGrid className={cn('transition-opacity', events.isPlaceholderData && 'opacity-60')}>
                {events.data.items.map((event) => (
                  <EventCard key={event.id} event={event} now={now} />
                ))}
              </EventCardGrid>
              <EventsPagination
                page={events.data.page}
                pageSize={events.data.pageSize}
                total={events.data.total}
                onPage={(page) => {
                  update({ page: page === 1 ? null : String(page) }, { keepPage: true });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onPageSize={(pageSize) => update({ pageSize: pageSize === DEFAULT_PAGE_SIZE ? null : pageSize })}
              />
            </>
          )}
        </section>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
          <SheetHeader className="border-b">
            <SheetTitle>Фильтры</SheetTitle>
          </SheetHeader>
          <div className="px-4">{filtersForm}</div>
          <SheetFooter className="border-t">
            <Button className="h-11" onClick={() => setSheetOpen(false)}>
              Показать {events.data ? eventsCount(events.data.total) : 'результаты'}
            </Button>
            <Button variant="outline" className="h-11" onClick={reset} disabled={activeCount === 0}>
              Сбросить
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="grid grid-cols-[64px_1fr] gap-3.5 rounded-2xl border p-4">
          <Skeleton className="h-20 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
