import {
  ApiResponse,
  ApiErrorResponse,
  PaginatedData,
} from '../helpers/response.interface';

export function successResponse<T>(
  data: T,
  message = 'Success',
): ApiResponse<T> {
  return { success: true, data, message };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): ApiResponse<PaginatedData<T>> {
  return {
    success: true,
    data: {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    message: 'Success',
  };
}

export function errorResponse(
  errorCode: string,
  message: string,
): ApiErrorResponse {
  return { success: false, errorCode, message };
}

export class ResponseHelper {
  static success<T>(data: T, message = 'Success') {
    return {
      success: true as const,
      message,
      data,
    };
  }

  static error(message: string, code = 400) {
    return {
      success: false as const,
      message,
      code,
    };
  }
}
