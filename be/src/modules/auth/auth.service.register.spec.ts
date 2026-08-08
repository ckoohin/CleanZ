import { UserRole } from 'src/common/enums/user-role.enum';
import { AuthService } from './auth.service';

describe('AuthService.register', () => {
  it('always creates a CUSTOMER for public registration', async () => {
    const create = jest.fn(
      (dto: { email: string; fullName: string; role: UserRole }) =>
        Promise.resolve({
          id: 'user-1',
          email: dto.email,
          fullName: dto.fullName,
          role: dto.role,
        }),
    );
    const createProfileIfNotExists = jest.fn().mockResolvedValue(undefined);
    const sendVerificationEmail = jest.fn().mockResolvedValue(undefined);

    const service = new AuthService(
      { create } as never,
      { sign: jest.fn().mockReturnValue('verify-token') } as never,
      {
        get: jest.fn((key: string) => {
          if (key === 'JWT_VERIFY_EMAIL_SECRET') return 'secret';
          if (key === 'FRONTEND_URL') return 'https://cleanz.test';
          return undefined;
        }),
      } as never,
      {} as never,
      { sendVerificationEmail } as never,
      {} as never,
      { createProfileIfNotExists } as never,
      { manager: {} } as never,
    );

    await service.register({
      email: 'applicant@example.com',
      password: 'Str0ng@Pass123',
      fullName: 'Applicant',
      role: UserRole.TASKER,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.CUSTOMER }),
    );
    expect(createProfileIfNotExists).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      'applicant@example.com',
      'Applicant',
      expect.stringContaining('intent=tasker'),
    );
  });
});
