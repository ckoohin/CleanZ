import { Response, CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { Injectable } from '@nestjs/common';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class CookieHelper {
  constructor(private readonly configService: ConfigService) {}
  private getCookieOptions() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as CookieOptions['sameSite'],
      path: '/',
    };
  }

  setTokenCookies(res: Response, tokens: TokenPair): void {
    const baseOptions = this.getCookieOptions();

    const accessExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as StringValue;
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as StringValue;

    res.cookie('access_token', tokens.access_token, {
      ...baseOptions,
      maxAge: ms(accessExpiresIn),
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      ...baseOptions,
      maxAge: ms(refreshExpiresIn),
    });
  }

  clearTokenCookies(res: Response): void {
    const baseOptions = this.getCookieOptions();

    res.clearCookie('access_token', baseOptions);
    res.clearCookie('refresh_token', baseOptions);
  }
}
