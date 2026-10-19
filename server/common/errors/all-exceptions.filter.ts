import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { AppException, ErrorCode, type ErrorDetail } from './app-exception.js';

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN_ROLE,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  413: ErrorCode.PAYLOAD_TOO_LARGE,
  429: ErrorCode.TOO_MANY_REQUESTS,
};

interface Normalized {
  status: number;
  code: string;
  message: string;
  details: ErrorDetail[];
}

/**
 * Приводит любую ошибку к виду { code, message, details, requestId }.
 * Внутренние подробности (стек, текст SQL) наружу не уходят — только в лог.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = req.requestId ?? 'unknown';

    const err = this.normalize(exception);
    if (err.status >= 500) {
      this.logger.error(
        `[${requestId}] ${req.method} ${req.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(err.status).json({ code: err.code, message: err.message, details: err.details, requestId });
  }

  private normalize(exception: unknown): Normalized {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let message = exception.message;
      let details: ErrorDetail[] = [];
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const m = (body as { message: unknown }).message;
        if (Array.isArray(m)) details = m.map((issue) => ({ issue: String(issue) }));
        else if (typeof m === 'string') message = m;
      }
      if (status === 404 && /^Cannot \w+ /.test(message)) message = 'Маршрут не найден';
      return {
        status,
        code: CODE_BY_STATUS[status] ?? (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST),
        message,
        details,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2025':
          return { status: 404, code: ErrorCode.NOT_FOUND, message: 'Запись не найдена', details: [] };
        case 'P2002':
          return {
            status: 409,
            code: ErrorCode.CONFLICT,
            message: 'Запись с такими данными уже существует',
            details: [],
          };
        case 'P2003':
          return {
            status: 400,
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Ссылка на несуществующую запись',
            details: [],
          };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Внутренняя ошибка сервера',
      details: [],
    };
  }
}
