import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppException, type ErrorDetail } from './errors/app-exception.js';

function flatten(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own: ErrorDetail[] = Object.entries(e.constraints ?? {}).map(([rule, issue]) => ({
      field,
      issue: rule === 'whitelistValidation' ? `Неизвестный параметр ${field}` : issue,
    }));
    return own.concat(flatten(e.children ?? [], field));
  });
}

/**
 * Глобальная валидация DTO: лишние поля запрещены (так PATCH не сможет
 * поменять status), типы приводятся, ошибки — 400 VALIDATION_FAILED.
 */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => AppException.validation('Некорректные параметры запроса', flatten(errors)),
  });
}
