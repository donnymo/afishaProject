import type { ReactNode } from 'react';
import { cn } from 'cn';

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-5 pb-12 md:px-6 md:pt-8 md:pb-16',
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight md:text-[32px]">{title}</h1>
        {description && <p className="max-w-[62ch] text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
