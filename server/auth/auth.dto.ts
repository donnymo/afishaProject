import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { trim, trimLower } from '../common/transforms.js';
import { Role } from '../generated/prisma/enums.js';

export class LoginDto {
  @ApiProperty({ example: 'organizer@afisha.local' })
  @Transform(trimLower)
  @IsEmail({}, { message: 'Некорректный email' })
  email: string;

  @ApiProperty({ example: 'demo-pass-2026' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MaxLength(200, { message: 'Пароль слишком длинный' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Студия «Резонанс»', description: 'Название организации или имя' })
  @Transform(trim)
  @IsString({ message: 'Укажите название' })
  @MinLength(2, { message: 'Название не короче 2 символов' })
  @MaxLength(120, { message: 'Название не длиннее 120 символов' })
  name: string;

  @ApiProperty({ example: 'studio@example.ru' })
  @Transform(trimLower)
  @IsEmail({}, { message: 'Некорректный email' })
  @MaxLength(254, { message: 'Email слишком длинный' })
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 200, example: 'correct-horse-battery' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль не короче 8 символов' })
  @MaxLength(200, { message: 'Пароль не длиннее 200 символов' })
  password: string;
}

export class UserDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: Role, enumName: 'Role' }) role: Role;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token, передаётся как Authorization: Bearer <token>' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ example: 900, description: 'Срок жизни токена в секундах' })
  expiresIn: number;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}
