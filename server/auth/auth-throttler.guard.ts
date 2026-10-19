import { HttpStatus, Injectable, Logger, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail, type ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppException, ErrorCode } from '../common/errors/app-exception.js';

const MINUTE = 60_000;

/** Email из тела до валидации: guard срабатывает раньше ValidationPipe. */
function emailTracker(req: Record<string, unknown>): string {
  const body = req.body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  return email ? `email:${email}` : `ip:${String(req.ip)}`;
}

/**
 * Два лимита на вход и регистрацию:
 * - default — по IP: один адрес не перебирает много аккаунтов и не забивает пул потоков scrypt;
 * - account — по email: распределённый перебор с разных IP не подбирает пароль одного аккаунта.
 * Счётчики в памяти процесса: при нескольких экземплярах API лимит действует на каждый отдельно.
 */
export const AUTH_THROTTLE_OPTIONS: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'default', ttl: MINUTE, limit: 20 },
    { name: 'account', ttl: 15 * MINUTE, limit: 10, blockDuration: 15 * MINUTE, getTracker: emailTracker },
  ],
};

/** ThrottlerGuard с ошибкой в общем формате API и стандартным Retry-After. */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  private readonly securityLog = new Logger('Security');

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    http.getResponse<Response>().setHeader('Retry-After', String(detail.timeToBlockExpire));
    // Без email и пароля в логе: только маршрут и requestId для расследования.
    this.securityLog.warn(`[${req.requestId ?? 'unknown'}] rate limit hit on ${req.method} ${req.path}`);
    throw new AppException(
      HttpStatus.TOO_MANY_REQUESTS,
      ErrorCode.TOO_MANY_REQUESTS,
      'Слишком много попыток. Подождите немного и попробуйте снова',
    );
  }
}
