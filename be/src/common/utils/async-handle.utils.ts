import {
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

const logger = new Logger('Exception');

export async function asyncHandleOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      if (status >= 500) {
        logger.error(`${errorMessage} | ${error.message}`, error.stack);
      } else {
        logger.warn(`${errorMessage} | ${error.message}`);
      }
      throw error;
    }

    logger.error(
      `${errorMessage} | ${String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );

    throw new InternalServerErrorException(errorMessage);
  }
}
