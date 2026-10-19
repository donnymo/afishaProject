import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_ID = /^[\w.-]{8,64}$/;

/**
 * Присваивает каждому запросу requestId: берёт X-Request-Id клиента,
 * если он похож на идентификатор, иначе генерирует UUID.
 * Тот же id уходит в заголовок ответа и в тело ошибок.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
