import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryUsersDto } from './query-users.dto';
import { UpdateUserStatusDto } from './update-user-status.dto';
import { UserRole } from 'src/common/enums/user-role.enum';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';

describe('QueryUsersDto', () => {
  it('transforms string "true" to boolean true for isActive', async () => {
    const dto = plainToInstance(QueryUsersDto, { isActive: 'true' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(true);
  });

  it('transforms string "false" to boolean false for isVerified', async () => {
    const dto = plainToInstance(QueryUsersDto, { isVerified: 'false' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.isVerified).toBe(false);
  });

  it('applies default page=1 and limit=10', async () => {
    const dto = plainToInstance(QueryUsersDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('coerces numeric string page and limit', async () => {
    const dto = plainToInstance(QueryUsersDto, { page: '2', limit: '20' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);
  });

  it('fails validation when limit exceeds 100', async () => {
    const dto = plainToInstance(QueryUsersDto, { limit: '200' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('fails validation for invalid role enum', async () => {
    const dto = plainToInstance(QueryUsersDto, { role: 'INVALID' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('accepts valid role enum', async () => {
    const dto = plainToInstance(QueryUsersDto, { role: UserRole.CUSTOMER });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid provider enum', async () => {
    const dto = plainToInstance(QueryUsersDto, { provider: AuthProvider.GOOGLE });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('UpdateUserStatusDto', () => {
  it('passes validation with isActive: false', async () => {
    const dto = plainToInstance(UpdateUserStatusDto, { isActive: false });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with isActive: true', async () => {
    const dto = plainToInstance(UpdateUserStatusDto, { isActive: true });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when isActive is missing', async () => {
    const dto = plainToInstance(UpdateUserStatusDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'isActive')).toBe(true);
  });

  it('fails validation when isActive is not a boolean', async () => {
    const dto = plainToInstance(UpdateUserStatusDto, { isActive: 'yes' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'isActive')).toBe(true);
  });
});
