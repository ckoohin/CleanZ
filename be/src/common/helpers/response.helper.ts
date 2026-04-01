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
