import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { AppConfig } from '../config/app-config.js';
import { EventStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PublicEventsCache } from './public-events-cache.js';

/**
 * Переводит закончившиеся опубликованные события в archived, чтобы выборки
 * по published не пробегали всю историю. Запрос идемпотентен и атомарен,
 * поэтому несколько экземпляров API могут запускать его одновременно без блокировок.
 */
@Injectable()
export class EventsArchiver implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(EventsArchiver.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly cache: PublicEventsCache,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.runSafely();
    this.timer = setInterval(() => void this.runSafely(), this.config.archiveIntervalSeconds * 1000);
    // Таймер не должен держать процесс живым при остановке.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Возвращает, сколько событий ушло в архив. */
  async archiveEnded(now = new Date()): Promise<number> {
    const { count } = await this.prisma.event.updateMany({
      where: { status: EventStatus.published, endsAt: { lt: now } },
      data: { status: EventStatus.archived },
    });
    if (count > 0) {
      this.cache.clear();
      this.logger.log(`Archived ${count} ended event(s)`);
    }
    return count;
  }

  // Архивация не критична для обслуживания запросов: сбой логируем и ждём следующего запуска.
  private async runSafely(): Promise<void> {
    try {
      await this.archiveEnded();
    } catch (error) {
      this.logger.error('Archiving ended events failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
