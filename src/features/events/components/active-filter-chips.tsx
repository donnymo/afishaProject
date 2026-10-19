import { XIcon } from 'lucide-react';
import type { Category } from '@/lib/types';
import type { EventFilters, FiltersPatch } from '../filters';

interface Chip {
  label: string;
  clear: FiltersPatch;
}

function chipsFor(filters: EventFilters, categories: Category[]): Chip[] {
  const chips: Chip[] = [];
  if (filters.from || filters.to) {
    chips.push({ label: [filters.from, filters.to].filter(Boolean).join(' — '), clear: { from: null, to: null } });
  }
  for (const slug of filters.categories) {
    chips.push({
      label: categories.find((c) => c.slug === slug)?.name ?? slug,
      clear: { category: filters.categories.filter((c) => c !== slug).join(',') },
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    const label = filters.maxPrice === '0' ? 'Бесплатно' : `${filters.minPrice || 0}–${filters.maxPrice || '∞'} ₽`;
    chips.push({ label, clear: { minPrice: null, maxPrice: null } });
  }
  return chips;
}

/** Включённые фильтры в одну строку: на телефоне панель фильтров спрятана. */
export function ActiveFilterChips({
  filters,
  categories = [],
  onChange,
}: {
  filters: EventFilters;
  categories?: Category[];
  onChange: (patch: FiltersPatch) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {chipsFor(filters, categories).map((chip) => (
        <span
          key={chip.label}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary pr-1.5 pl-3 text-[13px] font-medium text-primary-foreground"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Убрать фильтр ${chip.label}`}
            onClick={() => onChange(chip.clear)}
            className="grid size-[22px] place-items-center rounded-full bg-primary-foreground/15"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
