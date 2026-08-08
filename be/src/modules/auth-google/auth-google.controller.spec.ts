import { UserRole } from 'src/common/enums/user-role.enum';
import { AuthGoogleController } from './auth-google.controller';

describe('AuthGoogleController.googleAuthCallback', () => {
  const tokens = { accessToken: 'access', refreshToken: 'refresh' };

  function setup(role: UserRole) {
    const setTokenCookies = jest.fn();
    const redirect = jest.fn((url: string) => url);
    const controller = new AuthGoogleController(
      {
        handleGoogleLogin: jest.fn().mockResolvedValue({
          user: { role },
          tokens,
        }),
      } as never,
      { getOrThrow: jest.fn().mockReturnValue('https://cleanz.test') } as never,
      { setTokenCookies } as never,
    );

    return { controller, setTokenCookies, redirect };
  }

  it('routes a CUSTOMER tasker applicant to onboarding', async () => {
    const { controller, setTokenCookies, redirect } = setup(UserRole.CUSTOMER);

    await controller.googleAuthCallback(
      { user: {} as never, query: { state: 'tasker' } },
      { redirect } as never,
    );

    expect(setTokenCookies).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(
      'https://cleanz.test/become-partner/signup',
    );
  });

  it('routes an approved TASKER to the tasker dashboard', async () => {
    const { controller, redirect } = setup(UserRole.TASKER);

    await controller.googleAuthCallback(
      { user: {} as never, query: { state: 'tasker' } },
      { redirect } as never,
    );

    expect(redirect).toHaveBeenCalledWith('https://cleanz.test/tasker');
  });
});
