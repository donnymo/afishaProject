import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from './error-response.dto.js';

const DESCRIPTIONS: Record<number, string> = {
  400: 'Неверные параметры, даты или фильтры (VALIDATION_FAILED, EVENT_NOT_READY)',
  401: 'Токен отсутствует, неверен или просрочен (UNAUTHORIZED, TOKEN_EXPIRED, INVALID_CREDENTIALS)',
  403: 'Недостаточная роль или чужой ресурс (FORBIDDEN_ROLE, FORBIDDEN_NOT_OWNER)',
  404: 'Ресурс не найден или скрыт от вас (EVENT_NOT_FOUND, VENUE_NOT_FOUND, NOT_FOUND)',
  409: 'Конфликт состояния (INVALID_STATE_TRANSITION, EVENT_ALREADY_STARTED, EVENT_HIDDEN, EVENT_ARCHIVED, EMAIL_TAKEN)',
  429: 'Слишком много попыток, повторите позже (TOO_MANY_REQUESTS); время ожидания — в заголовке Retry-After',
};

/** Описывает в OpenAPI ошибки маршрута в едином формате ErrorResponseDto. */
export function ApiErrors(...statuses: Array<400 | 401 | 403 | 404 | 409 | 429>) {
  return applyDecorators(
    ...statuses.map((status) => ApiResponse({ status, description: DESCRIPTIONS[status], type: ErrorResponseDto })),
  );
}
