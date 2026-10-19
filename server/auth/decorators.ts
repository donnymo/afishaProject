import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '../generated/prisma/enums.js';
import type { AuthUser } from './auth-user.js';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Маршрут доступен без токена. Валидный токен всё равно разбирается — владелец увидит свой черновик. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Маршрут доступен только перечисленным ролям, иначе 403 FORBIDDEN_ROLE. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest<Request>().user;
});
