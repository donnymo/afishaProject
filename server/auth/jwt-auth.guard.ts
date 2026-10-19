import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppException, ErrorCode } from '../common/errors/app-exception.js';
import { Role } from '../generated/prisma/enums.js';
import type { JwtPayload } from './auth-user.js';
import { IS_PUBLIC } from './decorators.js';

const unauthorized = (code: ErrorCode, message: string) => new AppException(HttpStatus.UNAUTHORIZED, code, message);

/**
 * Глобальный guard: по умолчанию каждый маршрут требует access token.
 * Нет токена → 401 UNAUTHORIZED, просрочен → 401 TOKEN_EXPIRED.
 * На @Public() маршрутах токен необязателен: неверный просто игнорируется.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]) ?? false;
    const req = ctx.switchToHttp().getRequest<Request>();

    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      if (isPublic) return true;
      throw unauthorized(ErrorCode.UNAUTHORIZED, 'Требуется вход: передайте access token в заголовке Authorization');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (!payload.sub || !Object.values(Role).includes(payload.role)) throw new Error('bad payload');
      req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
      return true;
    } catch (e) {
      if (isPublic) return true;
      if (e instanceof Error && e.name === 'TokenExpiredError') {
        throw unauthorized(ErrorCode.TOKEN_EXPIRED, 'Срок действия токена истёк, войдите снова');
      }
      throw unauthorized(ErrorCode.UNAUTHORIZED, 'Недействительный токен');
    }
  }
}
