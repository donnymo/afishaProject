import { cn } from 'cn';
import type { ReactNode } from 'react';

/** Моноширинная метка для HTTP-статусов и кодов ошибок API. */
export function CodeBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[11.5px] font-medium text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}
