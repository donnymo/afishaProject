import { useEffect, useState } from 'react';

/**
 * Текущее время, которое обновляется раз в `intervalMs`.
 * Компоненты не вызывают Date.now() в рендере: результат рендера остаётся чистым,
 * а пометки вроде «Идёт сейчас» сами меняются со временем.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
