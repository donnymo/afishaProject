import type { Role } from '../generated/prisma/enums.js';

/** Пользователь из проверенного access token. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}
