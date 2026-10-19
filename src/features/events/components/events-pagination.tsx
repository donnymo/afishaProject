import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pageCount, pageWindow } from '@/lib/pagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../filters';

const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((value) => ({ value, label: value }));

export function EventsPagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (pageSize: string) => void;
}) {
  const pages = pageCount(total, pageSize);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Страницы" className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground tabular-nums">
        {first}–{last} из {total}
      </span>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-10"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Предыдущая страница"
        >
          <ChevronLeftIcon />
        </Button>
        {pageWindow(page, pages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className="grid size-10 place-items-center text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'outline' : 'ghost'}
              aria-current={item === page ? 'page' : undefined}
              className="size-10 tabular-nums"
              onClick={() => onPage(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-10"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Следующая страница"
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span id="page-size-label">На странице</span>
        <Select
          items={PAGE_SIZE_OPTIONS}
          value={String(pageSize)}
          onValueChange={(value) => onPageSize(String(value ?? DEFAULT_PAGE_SIZE))}
        >
          <SelectTrigger aria-labelledby="page-size-label" className="h-9 w-[76px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
