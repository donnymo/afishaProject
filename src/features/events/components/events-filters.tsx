import { useEffect, useRef, useState } from 'react';
import { ToggleChip } from '@/components/toggle-chip';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { Category } from '@/lib/types';
import { datePresets, type EventFilters, type FiltersPatch } from '../filters';

const PRICE_DEBOUNCE_MS = 400;

export function EventsFilters({
  filters,
  onChange,
  categories,
  fieldErrors,
  now,
}: {
  filters: EventFilters;
  onChange: (patch: FiltersPatch) => void;
  categories: Category[] | undefined;
  fieldErrors: Record<string, string>;
  now: number;
}) {
  const toggleCategory = (slug: string) => {
    const next = filters.categories.includes(slug)
      ? filters.categories.filter((c) => c !== slug)
      : [...filters.categories, slug];
    onChange({ category: next.join(',') });
  };

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm font-medium">Когда</legend>
        <div className="flex flex-wrap gap-1.5">
          {datePresets(new Date(now)).map((preset) => {
            const active = filters.from === preset.from && filters.to === preset.to;
            return (
              <ToggleChip
                key={preset.key}
                pressed={active}
                onClick={() => onChange(active ? { from: null, to: null } : { from: preset.from, to: preset.to })}
              >
                {preset.label}
              </ToggleChip>
            );
          })}
        </div>
        <div className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-2">
          <Label htmlFor="f-from" className="font-normal text-muted-foreground">
            с
          </Label>
          <Input
            id="f-from"
            type="date"
            className="h-10"
            value={filters.from}
            aria-invalid={!!fieldErrors.from}
            onChange={(e) => onChange({ from: e.target.value })}
          />
          <Label htmlFor="f-to" className="font-normal text-muted-foreground">
            по
          </Label>
          <Input
            id="f-to"
            type="date"
            className="h-10"
            value={filters.to}
            min={filters.from || undefined}
            aria-invalid={!!fieldErrors.to}
            onChange={(e) => onChange({ to: e.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col">
        <legend className="mb-2.5 text-sm font-medium">Категории</legend>
        <div className="flex flex-wrap gap-1.5">
          {categories
            ? categories.map((category) => (
                <ToggleChip
                  key={category.id}
                  pressed={filters.categories.includes(category.slug)}
                  onClick={() => toggleCategory(category.slug)}
                >
                  {category.name}
                </ToggleChip>
              ))
            : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm font-medium">Цена, ₽</legend>
        <PriceRange
          min={filters.minPrice}
          max={filters.maxPrice}
          errors={fieldErrors}
          onCommit={(range) => onChange({ minPrice: range.min, maxPrice: range.max })}
        />
        <Label className="font-normal">
          <Checkbox
            checked={filters.maxPrice === '0'}
            onCheckedChange={(checked) => onChange({ maxPrice: checked ? '0' : null, minPrice: null })}
          />
          Только бесплатные
        </Label>
      </fieldset>
    </div>
  );
}

interface Range {
  min: string;
  max: string;
}

/** Поля цены: ввод отправляется в URL с задержкой, внешний сброс фильтров очищает поля. */
function PriceRange({
  min,
  max,
  errors,
  onCommit,
}: {
  min: string;
  max: string;
  errors: Record<string, string>;
  onCommit: (range: Range) => void;
}) {
  const [draft, setDraft] = useState<Range>({ min, max });
  const [synced, setSynced] = useState<Range>({ min, max });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Значения из URL поменялись снаружи (сброс, «Только бесплатные»): подстраиваем поля прямо в рендере.
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max });
    setDraft({ min, max });
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (patch: Partial<Range>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(next), PRICE_DEBOUNCE_MS);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Input
        aria-label="Цена от"
        placeholder="от"
        inputMode="numeric"
        className="h-10 tabular-nums"
        value={draft.min}
        aria-invalid={!!errors.minPrice}
        onChange={(e) => change({ min: e.target.value.trim() })}
      />
      <Input
        aria-label="Цена до"
        placeholder="до"
        inputMode="numeric"
        className="h-10 tabular-nums"
        value={draft.max}
        aria-invalid={!!errors.maxPrice}
        onChange={(e) => change({ max: e.target.value.trim() })}
      />
    </div>
  );
}
