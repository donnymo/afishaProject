import { cn } from 'cn';
import { MapPinIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { dateTile, fmtPrice, isOngoing } from '@/lib/format';
import { cityName, DEFAULT_CITY, type EventItem } from '@/lib/types';

/** Сетка карточек: адаптивные колонки, строки делят карточки через subgrid. */
export function EventCardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5', className)}>{children}</div>
  );
}

/**
 * Карточка занимает четыре строки сетки-родителя и делит их через subgrid:
 * бейджи, заголовок, площадка и цена у карточек одного ряда стоят на одних линиях.
 * Родитель — EventCardGrid.
 */
export function EventCard({ event, now }: { event: EventItem; now: number }) {
  const tile = event.startsAt ? dateTile(event.startsAt) : null;

  return (
    <Link
      to={`/events/${event.id}`}
      className="row-span-4 grid grid-cols-[64px_minmax(0,1fr)] grid-rows-subgrid gap-x-3.5 gap-y-2 rounded-2xl border bg-card p-4 shadow-xs transition-colors outline-none hover:border-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="row-span-4 flex flex-col items-center self-start rounded-xl bg-muted px-0 pt-2 pb-2.5">
        {tile ? (
          <>
            <span className="text-2xl leading-tight font-semibold tabular-nums">{tile.day}</span>
            <span className="text-xs font-medium">{tile.month}</span>
            <span className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              {tile.weekday}, {tile.time}
            </span>
          </>
        ) : (
          <span className="py-3 text-xs text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap content-start gap-1">
        {event.categories.map((category) => (
          <Badge key={category.id} variant="secondary" className="h-[22px] px-2">
            {category.name}
          </Badge>
        ))}
        {isOngoing(event, now) && (
          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-current" />
            Идёт сейчас
          </span>
        )}
      </div>

      <h3 className="col-start-2 text-[15px] leading-snug font-semibold tracking-tight">{event.title}</h3>

      {/* Строка площадки есть всегда, даже пустая: иначе цена уехала бы на её место. */}
      <div className="col-start-2 flex gap-1.5 text-[13px] text-muted-foreground">
        {event.venue && (
          <>
            <MapPinIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {event.venue.name}
              {event.city !== DEFAULT_CITY && `, ${cityName(event.city)}`}
            </span>
          </>
        )}
      </div>

      <div className="col-start-2 flex items-center justify-between gap-2 self-end pt-0.5">
        <span className="font-semibold tabular-nums">{fmtPrice(event.price, { from: true })}</span>
        {event.ageLimit !== null && (
          <Badge variant="outline" className="h-[22px] px-2 tabular-nums">
            {event.ageLimit}+
          </Badge>
        )}
      </div>
    </Link>
  );
}
