import type { Page } from '../common/pagination.js';
import { AppConfig } from '../config/app-config.js';
import type { EventDto } from './events.dto.js';
import { PublicEventsCache } from './public-events-cache.js';

const env = { DATABASE_URL: 'postgresql://localhost/db', JWT_SECRET: 'x'.repeat(32) };
type Loader = () => Promise<Page<EventDto>>;

const page = (total: number): Page<EventDto> => ({ items: [], total, page: 1, pageSize: 20 });
const cacheWithTtl = (seconds: number) =>
  new PublicEventsCache(new AppConfig({ ...env, PUBLIC_CACHE_TTL_SECONDS: String(seconds) }));

describe('PublicEventsCache', () => {
  afterEach(() => vi.useRealTimers());

  it('одновременные промахи по одному ключу ждут один запрос', async () => {
    const cache = cacheWithTtl(10);
    const load = vi.fn<Loader>(async () => page(1));
    await Promise.all([cache.getOrLoad('k', load), cache.getOrLoad('k', load), cache.getOrLoad('k', load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('по истечении TTL загружает заново', async () => {
    vi.useFakeTimers();
    const cache = cacheWithTtl(10);
    const load = vi.fn<Loader>(async () => page(1));
    await cache.getOrLoad('k', load);
    vi.advanceTimersByTime(10_001);
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('не кэширует ошибку', async () => {
    const cache = cacheWithTtl(10);
    await expect(cache.getOrLoad('k', () => Promise.reject(new Error('db down')))).rejects.toThrow('db down');
    await expect(cache.getOrLoad('k', async () => page(2))).resolves.toMatchObject({ total: 2 });
  });

  it('clear() сбрасывает всё', async () => {
    const cache = cacheWithTtl(10);
    await cache.getOrLoad('k', async () => page(1));
    cache.clear();
    await expect(cache.getOrLoad('k', async () => page(2))).resolves.toMatchObject({ total: 2 });
  });

  it('с TTL 0 кэш выключен', async () => {
    const cache = cacheWithTtl(0);
    const load = vi.fn<Loader>(async () => page(1));
    await cache.getOrLoad('k', load);
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('не растёт больше предела: самая старая запись вытесняется', async () => {
    const cache = cacheWithTtl(10);
    const first = vi.fn<Loader>(async () => page(0));
    await cache.getOrLoad('key-0', first);
    for (let i = 1; i <= 500; i++) await cache.getOrLoad(`key-${i}`, async () => page(i));
    await cache.getOrLoad('key-0', first);
    expect(first).toHaveBeenCalledTimes(2);
  });
});
