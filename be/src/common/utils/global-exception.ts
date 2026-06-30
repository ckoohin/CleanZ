import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';

const logger = new Logger('GLOBAL_EXCEPTION');

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 401/403 từ auth guard là hành vi bình thường — không log
    if (
      exception instanceof UnauthorizedException ||
      exception instanceof ForbiddenException
    ) {
      return response.status(status).json({
        errors: exception.getResponse(),
        path: request.url,
        statusCode: status,
        timestamp: new Date().toISOString(),
      });
    }

    // 4xx client errors → warn, 5xx → error với stack trace
    if (status >= 400 && status < 500) {
      logger.warn(
        `[${status}] ${request.url} — ${
          exception instanceof HttpException
            ? JSON.stringify(exception.getResponse())
            : String(exception)
        }`,
      );
    } else {
      logger.error(exception);
    }

    response.status(status).json({
      errors:
        exception instanceof HttpException
          ? exception.getResponse()
          : 'Internal server error',
      path: request.url,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
