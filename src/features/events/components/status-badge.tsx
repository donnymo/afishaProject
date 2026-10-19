import { cn } from 'cn';
import type { EventStatus } from '@/lib/types';

const STYLES = {
  draft: { label: 'Черновик', className: 'border border-dashed border-border text-muted-foreground' },
  published: { label: 'Опубликовано', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  hidden: { label: 'Скрыто', className: 'bg-destructive/10 text-destructive' },
  archived: { label: 'В архиве', className: 'bg-muted text-muted-foreground' },
  past: { label: 'Прошло', className: 'bg-muted text-muted-foreground' },
} as const;

/**
 * Статус карточки. Опубликованное и уже закончившееся событие, которое ещё не
 * перенесли в архив, показывается как «Прошло».
 */
export function StatusBadge({
  status,
  past = false,
  className,
}: {
  status: EventStatus;
  past?: boolean;
  className?: string;
}) {
  const style = STYLES[status === 'published' && past ? 'past' : status];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        style.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {style.label}
    </span>
  );
}
