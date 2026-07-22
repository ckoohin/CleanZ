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
import { Request, Response } from 'express';

const logger = new Logger('GLOBAL_EXCEPTION');

const STATUS_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]:
    'Thông tin gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
  [HttpStatus.UNAUTHORIZED]:
    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  [HttpStatus.FORBIDDEN]: 'Bạn không có quyền thực hiện thao tác này.',
  [HttpStatus.NOT_FOUND]: 'Không tìm thấy thông tin yêu cầu.',
  [HttpStatus.REQUEST_TIMEOUT]:
    'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.',
  [HttpStatus.CONFLICT]:
    'Dữ liệu đã thay đổi hoặc bị trùng. Vui lòng tải lại và thử lại.',
  [HttpStatus.PAYLOAD_TOO_LARGE]:
    'Dữ liệu tải lên vượt quá dung lượng cho phép.',
  [HttpStatus.UNPROCESSABLE_ENTITY]:
    'Thông tin gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
  [HttpStatus.TOO_MANY_REQUESTS]:
    'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.',
};

const DEFAULT_ERROR_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại.';
const SERVER_ERROR_MESSAGE = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';

const TECHNICAL_SUFFIX =
  /(?:[,|\-–—]\s*)?(?:Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Unprocessable Entity|Internal Server Error|Service Unavailable)(?:\s*,?\s*\d{3})?\s*$/i;
const VIETNAMESE_TEXT = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơưẠ-ỹ]/;
const TECHNICAL_KEYS = new Set([
  'error',
  'status',
  'statusCode',
  'path',
  'timestamp',
  'stack',
  'name',
  'code',
]);

function extractMessages(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) return [];
  if (typeof value === 'string') return [value];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractMessages(item, depth + 1));
  }

  if (typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;

  // Nest đặt nội dung nghiệp vụ trong `message`. Chỉ đọc nhánh này để không
  // ghép thêm `error: Bad Request` và `statusCode: 400` vào thông báo người dùng.
  if (record.message != null) {
    return extractMessages(record.message, depth + 1);
  }

  if (record.errors != null) {
    return extractMessages(record.errors, depth + 1);
  }

  return Object.entries(record).flatMap(([key, item]) =>
    TECHNICAL_KEYS.has(key) ? [] : extractMessages(item, depth + 1),
  );
}

function cleanPublicMessage(message: string): string | null {
  const cleaned = message.replace(TECHNICAL_SUFFIX, '').trim();
  if (!cleaned || !VIETNAMESE_TEXT.test(cleaned)) return null;
  return cleaned;
}

export function getPublicErrorMessage(
  exception: unknown,
  status: number,
): string {
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return SERVER_ERROR_MESSAGE;
  }

  // Không đưa chi tiết token/JWT ra client. Refresh token sai hoặc hết hạn là
  // trạng thái phiên bình thường và được frontend xử lý âm thầm.
  if (status === HttpStatus.UNAUTHORIZED) {
    return STATUS_MESSAGES[HttpStatus.UNAUTHORIZED]!;
  }

  const response =
    exception instanceof HttpException ? exception.getResponse() : exception;
  const messages = extractMessages(response)
    .map(cleanPublicMessage)
    .filter((message): message is string => Boolean(message));
  const uniqueMessages = [...new Set(messages)];

  return (
    uniqueMessages.join('; ') ||
    STATUS_MESSAGES[status] ||
    DEFAULT_ERROR_MESSAGE
  );
}

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

    // 401/403 từ guard là trạng thái xác thực/phân quyền bình thường. Đặc biệt
    // không ghi log refresh token sai/hết hạn để tránh làm nhiễu log vận hành.
    if (
      !(exception instanceof UnauthorizedException) &&
      !(exception instanceof ForbiddenException)
    ) {
      if (status >= 400 && status < 500) {
        logger.warn(
          `[${status}] ${request.method ?? 'REQUEST'} ${request.url} — ${
            exception instanceof HttpException
              ? JSON.stringify(exception.getResponse())
              : String(exception)
          }`,
        );
      } else {
        const error = exception instanceof Error ? exception : undefined;
        logger.error(
          `[${status}] ${request.method ?? 'REQUEST'} ${request.url} — ${String(
            exception,
          )}`,
          error?.stack,
        );
      }
    }

    return response.status(status).json({
      message: getPublicErrorMessage(exception, status),
      path: request.url,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
