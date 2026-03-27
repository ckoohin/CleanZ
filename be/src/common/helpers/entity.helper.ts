import { FindOneOptions, Repository, ObjectLiteral } from 'typeorm';
import { AppException } from '../exceptions/app.exception';

export async function findOrFail<T extends ObjectLiteral>(
  repo: Repository<T>,
  options: FindOneOptions<T>,
  message = 'Not found',
): Promise<T> {
  const entity = await repo.findOne(options);
  if (!entity) throw new AppException(message, 404);
  return entity;
}
