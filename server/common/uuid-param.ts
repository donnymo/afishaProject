import { ParseUUIDPipe } from '@nestjs/common';
import { AppException } from './errors/app-exception.js';

/** ParseUUIDPipe с ошибкой в общем формате: 400 VALIDATION_FAILED. */
export const uuidPipe = () =>
  new ParseUUIDPipe({
    exceptionFactory: () => AppException.validation('Некорректный id', [{ field: 'id', issue: 'Ожидается UUID' }]),
  });
