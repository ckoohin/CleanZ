/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';

const makeClient = (over: { cookie?: string; authToken?: string }): any => ({
  handshake: {
    headers: { cookie: over.cookie },
    auth: over.authToken ? { token: over.authToken } : {},
  },
});

describe('WsJwtGuard.verifyFromHandshake (TC-U-WS)', () => {
  let guard: WsJwtGuard;
  let jwt: { verify: jest.Mock };

  beforeEach(() => {
    jwt = { verify: jest.fn() };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;
    guard = new WsJwtGuard(jwt as unknown as JwtService, config);
  });

  it('cookie access_token hợp lệ → trả userId (sub)', () => {
    jwt.verify.mockReturnValue({ sub: 'u1', email: 'a@b.c', role: 'CUSTOMER' });
    const res = guard.verifyFromHandshake(
      makeClient({ cookie: 'access_token=valid.jwt.token; other=x' }),
    );
    expect(res).toBe('u1');
    expect(jwt.verify).toHaveBeenCalledWith('valid.jwt.token', {
      secret: 'secret',
    });
  });

  it('cookie sai chữ ký / hết hạn → null', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const res = guard.verifyFromHandshake(
      makeClient({ cookie: 'access_token=bad' }),
    );
    expect(res).toBeNull();
  });

  it('không cookie nhưng có handshake.auth.token → verify token (fallback mobile)', () => {
    jwt.verify.mockReturnValue({ sub: 'u2' });
    const res = guard.verifyFromHandshake(
      makeClient({ authToken: 'mobile.jwt.token' }),
    );
    expect(res).toBe('u2');
    expect(jwt.verify).toHaveBeenCalledWith('mobile.jwt.token', {
      secret: 'secret',
    });
  });

  it('không cookie, không auth.token → null (không gọi verify)', () => {
    const res = guard.verifyFromHandshake(makeClient({}));
    expect(res).toBeNull();
    expect(jwt.verify).not.toHaveBeenCalled();
  });
});
