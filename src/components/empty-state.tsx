import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';
import { CodeBadge } from './code-badge';

export function EmptyState({
  icon: Icon,
  code,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  code?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2.5 rounded-2xl border border-dashed px-5 py-12 text-center',
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-muted">
        <Icon className="size-5" />
      </span>
      {code && <CodeBadge>{code}</CodeBadge>}
      <h2 className="text-base font-semibold">{title}</h2>
      {children && <p className="max-w-[46ch] text-muted-foreground">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
