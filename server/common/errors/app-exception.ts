import { HttpException, HttpStatus } from '@nestjs/common';

/** Деталь ошибки: какое поле и что с ним не так. */
export interface ErrorDetail {
  field?: string;
  issue: string;
}

/**
 * Машиночитаемые коды ошибок API. Клиент ветвится по `code`,
 * а `message` показывает человеку.
 */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EVENT_NOT_READY: 'EVENT_NOT_READY',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
  FORBIDDEN_NOT_OWNER: 'FORBIDDEN_NOT_OWNER',
  NOT_FOUND: 'NOT_FOUND',
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  VENUE_NOT_FOUND: 'VENUE_NOT_FOUND',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  EVENT_ALREADY_STARTED: 'EVENT_ALREADY_STARTED',
  EVENT_HIDDEN: 'EVENT_HIDDEN',
  EVENT_ARCHIVED: 'EVENT_ARCHIVED',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super({ code, message, details }, status);
  }

  static validation(message: string, details: ErrorDetail[]) {
    return new AppException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, message, details);
  }
}
