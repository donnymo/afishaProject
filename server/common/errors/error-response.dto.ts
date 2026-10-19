import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from './app-exception.js';

export class ErrorDetailDto {
  @ApiPropertyOptional({ example: 'venueId', description: 'Поле запроса, к которому относится проблема' })
  field?: string;

  @ApiProperty({ example: 'Не выбрана площадка' })
  issue: string;
}

/** Единый формат любой ошибки API. */
export class ErrorResponseDto {
  @ApiProperty({ enum: Object.values(ErrorCode), example: ErrorCode.EVENT_NOT_READY })
  code: string;

  @ApiProperty({ example: 'Черновик нельзя опубликовать: заполните обязательные поля' })
  message: string;

  @ApiProperty({ type: [ErrorDetailDto] })
  details: ErrorDetailDto[];

  @ApiProperty({ example: '6f1c9a2e-3b7d-4c55-9a51-0e2f7c1d8b44', description: 'Совпадает с заголовком X-Request-Id' })
  requestId: string;
}
