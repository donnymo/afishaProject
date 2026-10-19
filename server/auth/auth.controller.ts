import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '../common/errors/api-errors.decorator.js';
import { AuthThrottlerGuard } from './auth-throttler.guard.js';
import type { AuthUser } from './auth-user.js';
import { AuthResponseDto, LoginDto, RegisterDto, UserDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Post('register')
  @ApiOperation({
    summary: 'Регистрация организатора',
    description: 'Создаёт пользователя с ролью organizer и сразу выдаёт access token.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiErrors(400, 409, 429)
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Вход по email и паролю',
    description: 'Не больше 20 попыток в минуту с одного IP и 10 попыток за 15 минут на один email, иначе 429.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiErrors(400, 401, 429)
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь по токену' })
  @ApiOkResponse({ type: UserDto })
  @ApiErrors(401)
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.auth.me(user);
  }
}
