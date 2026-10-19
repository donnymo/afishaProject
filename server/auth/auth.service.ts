import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppException, ErrorCode } from '../common/errors/app-exception.js';
import { AppConfig } from '../config/app-config.js';
import { Prisma, type User } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser, JwtPayload } from './auth-user.js';
import type { AuthResponseDto, LoginDto, RegisterDto, UserDto } from './auth.dto.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';

const toUserDto = (user: User): UserDto => ({ id: user.id, email: user.email, name: user.name, role: user.role });

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  /** Регистрация всегда даёт роль organizer; модераторов назначают через seed/БД. */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash: await hashPassword(dto.password),
          role: Role.organizer,
        },
      });
      return await this.issueToken(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(HttpStatus.CONFLICT, ErrorCode.EMAIL_TAKEN, 'Аккаунт с таким email уже существует', [
          { field: 'email', issue: 'Email занят' },
        ]);
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Хешируем даже для несуществующего email, чтобы по времени ответа нельзя было перебирать адреса.
    const passwordMatches = await verifyPassword(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS, 'Неверный email или пароль');
    }
    return this.issueToken(user);
  }

  async me(auth: AuthUser): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: auth.id } });
    if (!user) {
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, 'Пользователь больше не существует');
    }
    return toUserDto(user);
  }

  private async issueToken(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const expiresIn = this.config.jwtExpiresIn;
    const accessToken = await this.jwt.signAsync(payload, { expiresIn });
    return { accessToken, tokenType: 'Bearer', expiresIn, user: toUserDto(user) };
  }
}
