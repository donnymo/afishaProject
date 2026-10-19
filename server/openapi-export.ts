import 'dotenv/config';
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { buildOpenApi, configureApp } from './app.setup.js';

// Пишет openapi.json в корень проекта, не поднимая HTTP-сервер.
const app = configureApp(await NestFactory.create(AppModule, { logger: ['error'] }));
writeFileSync('openapi.json', JSON.stringify(buildOpenApi(app), null, 2) + '\n');
await app.close();
console.log('openapi.json written');
