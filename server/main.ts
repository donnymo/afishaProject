import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { buildOpenApi, configureApp } from './app.setup.js';
import { AppConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  const { trustProxyHops } = app.get(AppConfig);
  // Только известное число прокси: иначе клиент подделал бы IP через X-Forwarded-For и обошёл лимит на вход.
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);
  SwaggerModule.setup('docs', app, buildOpenApi(app), { jsonDocumentUrl: 'docs/openapi.json' });
  app.enableShutdownHooks();
  await app.listen(app.get(AppConfig).port);
}

await bootstrap();
