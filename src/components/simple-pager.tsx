import { Button } from '@/components/ui/button';
import { pageCount } from '@/lib/pagination';

/** «Назад / Дальше» для служебных списков. Скрывается, если всё помещается на одну страницу. */
export function SimplePager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = pageCount(total, pageSize);
  if (pages <= 1) return null;

  return (
    <nav aria-label="Страницы" className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground tabular-nums">
        Страница {page} из {pages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Назад
        </Button>
        <Button variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Дальше
        </Button>
      </div>
    </nav>
  );
}
