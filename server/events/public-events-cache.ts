import { Injectable } from '@nestjs/common';
import type { Page } from '../common/pagination.js';
import { AppConfig } from '../config/app-config.js';
import type { EventDto } from './events.dto.js';

/** Комбинаций фильтров бесконечно много: без предела перебор параметров раздул бы память. */
const MAX_ENTRIES = 500;

interface Entry {
  expiresAt: number;
  value: Promise<Page<EventDto>>;
}

/**
 * Короткий кэш публичной афиши в памяти процесса. Выдача одинакова для всех,
 * поэтому в пик одинаковые запросы не должны каждый раз доходить до базы.
 * Хранится Promise: одновременные промахи по одному ключу ждут один запрос к БД.
 * Другие экземпляры API узнают об изменениях не позже чем через TTL.
 */
@Injectable()
export class PublicEventsCache {
  private readonly entries = new Map<string, Entry>();
  private readonly ttlMs: number;

  constructor(config: AppConfig) {
    this.ttlMs = config.publicCacheTtlSeconds * 1000;
  }

  getOrLoad(key: string, load: () => Promise<Page<EventDto>>): Promise<Page<EventDto>> {
    if (this.ttlMs === 0) return load();

    const now = Date.now();
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > now) return cached.value;

    this.entries.delete(key);
    if (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }

    const value = load();
    this.entries.set(key, { expiresAt: now + this.ttlMs, value });
    // Ошибку не кэшируем: следующий запрос попробует снова.
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    });
    return value;
  }

  /** Вызывается при любом изменении, которое может затронуть публичную выдачу. */
  clear(): void {
    this.entries.clear();
  }
}
