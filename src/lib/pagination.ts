export type PageItem = number | 'gap';

/** Номера страниц для пагинации: первая, последняя и соседи текущей, пропуски — 'gap'. */
export function pageWindow(page: number, pages: number): PageItem[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

  const visible = [...new Set([1, pages, page - 1, page, page + 1])]
    .filter((p) => p >= 1 && p <= pages)
    .toSorted((a, b) => a - b);

  return visible.flatMap((p, i): PageItem[] => (i > 0 && p - visible[i - 1] > 1 ? ['gap', p] : [p]));
}

/** Глубже сервер не листает (MAX_PAGE в server/common/pagination.ts): дальше нужны фильтры. */
export const MAX_PAGE = 200;

/**
 * Номер страницы из URL. Ручная правка ссылки не должна давать 400 от API:
 * мусор — первая страница, слишком большой номер — последняя доступная.
 */
export function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

export const pageCount = (total: number, pageSize: number) =>
  Math.min(MAX_PAGE, Math.max(1, Math.ceil(total / pageSize)));
