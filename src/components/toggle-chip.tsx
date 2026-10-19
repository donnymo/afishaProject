import { cn } from 'cn';
import type { ComponentProps } from 'react';

/** Кнопка-переключатель в виде «таблетки»: категории, быстрые диапазоны дат. */
export function ToggleChip({
  pressed,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'type' | 'aria-pressed'> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        pressed ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
        className,
      )}
      {...props}
    />
  );
}
