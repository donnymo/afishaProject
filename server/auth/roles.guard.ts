import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException, ErrorCode } from '../common/errors/app-exception.js';
import type { Role } from '../generated/prisma/enums.js';
import { ROLES } from './decorators.js';

/** Проверяет @Roles(). Срабатывает после JwtAuthGuard, поэтому user уже известен. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest<Request>().user;
    if (!user) throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, 'Требуется вход');
    if (!roles.includes(user.role)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN_ROLE,
        `Действие доступно роли: ${roles.join(', ')}`,
        [{ field: 'role', issue: `Ваша роль — ${user.role}` }],
      );
    }
    return true;
  }
}
