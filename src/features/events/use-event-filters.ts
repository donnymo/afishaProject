import { useSearchParams } from 'react-router';
import { applyPatch, countActive, readFilters, type FiltersPatch } from './filters';

/** Фильтры афиши живут в URL: ссылкой с ними можно поделиться, а «Назад» их восстанавливает. */
export function useEventFilters() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);

  // Функциональное обновление: отложенный ввод цены не затрёт фильтры, изменённые за это время.
  const update = (patch: FiltersPatch, options?: { keepPage?: boolean }) =>
    setParams((prev) => applyPatch(prev, patch, options), { replace: true });

  // Размер страницы — настройка просмотра, а не фильтр, поэтому при сбросе он сохраняется.
  const reset = () =>
    setParams(
      (prev) => {
        const pageSize = prev.get('pageSize');
        return new URLSearchParams(pageSize ? { pageSize } : {});
      },
      { replace: true },
    );

  return { filters, update, reset, activeCount: countActive(filters) };
}
