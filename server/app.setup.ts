import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { ErrorResponseDto } from './common/errors/error-response.dto.js';
import { requestIdMiddleware } from './common/request-id.js';
import { createValidationPipe } from './common/validation.js';
import { AppConfig } from './config/app-config.js';

/** Общая настройка для main.ts, тестов и экспорта OpenAPI. */
export function configureApp<T extends INestApplication>(app: T): T {
  app.use(requestIdMiddleware);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: app.get(AppConfig).corsOrigins, exposedHeaders: ['X-Request-Id'] });
  return app;
}

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Афиша Москвы API')
    .setDescription(
      [
        'Публичная афиша, кабинет организатора и модерация.',
        '',
        '**Аутентификация.** POST /auth/login или /auth/register возвращают JWT access token. Передавайте его как `Authorization: Bearer <token>`.',
        '',
        '**Пагинация.** Offset: `page` (с 1) и `pageSize` (1–50). Ответ: `{ items, total, page, pageSize }`.',
        '',
        '**Ошибки.** Всегда `{ code, message, details, requestId }`: 400 — неверные параметры, 401 — нет или просрочен токен, ' +
          '403 — не та роль или чужое событие, 404 — нет ресурса, 409 — конфликт состояния.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  return SwaggerModule.createDocument(app, config, { extraModels: [ErrorResponseDto] });
}
