import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(message: string, status = HttpStatus.BAD_REQUEST) {
    super(
      {
        success: false,
        message,
      },
      status,
    );
  }
}
