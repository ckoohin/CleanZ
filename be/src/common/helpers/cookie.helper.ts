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

  private getBaseCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as CookieOptions['sameSite'],
      path: '/',
    };
  }

  private getCookieOptions(res: Response): CookieOptions {
    const baseOptions = this.getBaseCookieOptions();
    const cookieDomain = this.getCookieDomain(res);

    return {
      ...baseOptions,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };
  }

  private getCookieDomain(res: Response): string | undefined {
    const configuredDomain = this.configService
      .get<string>('COOKIE_DOMAIN')
      ?.trim();

    if (!configuredDomain) {
      return undefined;
    }

    const domainWithoutProtocol = configuredDomain.replace(
      /^https?:\/\//i,
      '',
    );
    const hostname = domainWithoutProtocol
      .split('/')[0]
      .replace(/:\d+$/, '')
      .replace(/^\.+/, '')
      .toLowerCase();

    // Trình duyệt tự quản lý cookie host-only khi chạy local. Truyền
    // localhost vào thuộc tính Domain vừa không cần thiết, vừa dễ bị từ chối.
    if (!hostname || hostname === 'localhost' || hostname.includes(':')) {
      return undefined;
    }

    const forwardedHost = res.req.headers['x-forwarded-host'];
    const requestHost = (
      Array.isArray(forwardedHost)
        ? forwardedHost[0]
        : forwardedHost?.split(',')[0] || res.req.hostname
    )
      ?.trim()
      .split(':')[0]
      .toLowerCase();

    // Chỉ gắn Domain khi request thực sự đến từ domain đã cấu hình.
    // Localhost sẽ dùng cookie host-only và vẫn chia sẻ được giữa các port.
    if (
      requestHost !== hostname &&
      !requestHost?.endsWith(`.${hostname}`)
    ) {
      return undefined;
    }

    return hostname;
  }

  setTokenCookies(res: Response, tokens: TokenPair): void {
    const baseOptions = this.getCookieOptions(res);
    const hostOnlyOptions = this.getBaseCookieOptions();

    const accessExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as StringValue;
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as StringValue;

    // Xóa cookie host-only cũ của api subdomain trước khi chuyển sang cookie
    // dùng chung parent domain. Nếu giữ cả hai cookie trùng tên, cookie-parser
    // có thể đọc nhầm token cũ và tạo vòng lặp 401 -> refresh thất bại.
    res.clearCookie('access_token', hostOnlyOptions);
    res.clearCookie('refresh_token', hostOnlyOptions);

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
    const baseOptions = this.getCookieOptions(res);
    const hostOnlyOptions = this.getBaseCookieOptions();

    res.clearCookie('access_token', baseOptions);
    res.clearCookie('refresh_token', baseOptions);
    res.clearCookie('access_token', hostOnlyOptions);
    res.clearCookie('refresh_token', hostOnlyOptions);
  }
}
