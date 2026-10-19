import { CircleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';
import type { ApiError } from '@/lib/api';

/** Показывает ошибку API: заголовок, код, список details и requestId для поддержки. */
export function ErrorAlert({
  error,
  title,
  action,
  className,
}: {
  error: ApiError;
  title?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'grid grid-cols-[16px_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3.5 text-destructive',
        className,
      )}
    >
      <CircleAlertIcon className="mt-0.5 size-4" />
      <div className="flex flex-wrap items-center gap-2">
        <b className="font-semibold">{title ?? error.message}</b>
        {error.status > 0 && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[11.5px] font-medium">
            {error.status} · {error.code}
          </span>
        )}
      </div>
      <div className="col-start-2 flex flex-col gap-2 text-sm text-destructive/90">
        {title && <p>{error.message}</p>}
        {error.details.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4">
            {error.details.map((d, i) => (
              <li key={i}>{d.issue}</li>
            ))}
          </ul>
        )}
        {(action || error.requestId) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {error.requestId && (
              <span className="font-mono text-xs text-muted-foreground select-all">requestId: {error.requestId}</span>
            )}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
