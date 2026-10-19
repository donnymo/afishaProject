import { cn } from 'cn';
import { CheckCircle2Icon, CircleAlertIcon } from 'lucide-react';
import type { ReadinessCheck } from '../readiness';

export function ReadinessCard({ checks }: { checks: ReadinessCheck[] }) {
  const done = checks.filter((check) => check.ok).length;

  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border bg-card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Готовность к публикации</h2>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {done} из {checks.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Готовность к публикации"
        aria-valuemin={0}
        aria-valuemax={checks.length}
        aria-valuenow={done}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${(done / checks.length) * 100}%` }}
        />
      </div>
      <ul className="flex flex-col gap-2.5">
        {checks.map((check) => (
          <li
            key={check.key}
            className={cn(
              'flex items-center gap-2.5',
              check.ok ? 'text-foreground/80' : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {check.ok ? (
              <CheckCircle2Icon className="size-[18px] text-emerald-600" aria-label="готово" />
            ) : (
              <CircleAlertIcon className="size-[18px]" aria-label="не готово" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
