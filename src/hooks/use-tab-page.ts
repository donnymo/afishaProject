import { useSearchParams } from 'react-router';
import { readPage } from '@/lib/pagination';

/**
 * Вкладка (?status=) и страница (?page=) служебного списка живут в URL.
 * Значения по умолчанию в URL не пишутся, смена вкладки возвращает на первую страницу.
 */
export function useTabPage<T extends string>(tabs: readonly T[], defaultTab: T) {
  const [params, setParams] = useSearchParams();
  const status = params.get('status');
  const isTab = (value: string | null): value is T => tabs.some((t) => t === value);
  const tab = isTab(status) ? status : defaultTab;
  const page = readPage(params);

  const go = (next: { tab?: T; page?: number }) => {
    const nextTab = next.tab ?? tab;
    const nextPage = next.page ?? 1;
    setParams(
      {
        ...(nextTab !== defaultTab && { status: nextTab }),
        ...(nextPage > 1 && { page: String(nextPage) }),
      },
      { replace: true },
    );
  };

  return { tab, page, go };
}
