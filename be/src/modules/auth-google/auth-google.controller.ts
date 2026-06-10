import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { CookieHelper } from 'src/common/helpers/cookie.helper';
import { CreateOAuthUserDto } from '../users/dto/create-oauth-user.dto';
import { AuthGoogleService } from './auth-google.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('auth/google')
@ApiTags('Auth Google')
export class AuthGoogleController {
  constructor(
    private readonly authGoogleService: AuthGoogleService,
    private readonly configService: ConfigService,
    private readonly cookieHelper: CookieHelper,
  ) {}

  @Get()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Khởi tạo đăng nhập Google OAuth' })
  @ApiOkResponse({ description: 'Redirect tới Google OAuth consent screen' })
  async googleAuth() {
    // Chuyển hướng sang trang đăng nhập Google
  }

  @Get('callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Callback Google OAuth sau khi người dùng xác thực',
  })
  @ApiOkResponse({
    description:
      'Đăng nhập OAuth thành công, set cookie và redirect về frontend',
  })
  async googleAuthCallback(
    @Req() req: { user: CreateOAuthUserDto; query: { state?: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authGoogleService.handleGoogleLogin(
      req.user,
    );

    const baseUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const state = req.query.state;

    // Strict Role Validation for Google Login
    if (state === 'admin' && user.role !== UserRole.ADMIN) {
      return res.redirect(`${baseUrl}/login-admin?error=UnauthorizedRole`);
    }
    if (state === 'tasker' && user.role !== UserRole.TASKER) {
      return res.redirect(`${baseUrl}/login-tasker?error=UnauthorizedRole`);
    }
    if (state === 'customer' && user.role !== UserRole.CUSTOMER) {
      return res.redirect(`${baseUrl}/login?error=UnauthorizedRole`);
    }

    // Validation passed, set cookies
    this.cookieHelper.setTokenCookies(res, tokens);

    // Redirect to respective dashboard
    if (state === 'admin') return res.redirect(`${baseUrl}/admin`);
    if (state === 'tasker') return res.redirect(`${baseUrl}/tasker`);
    if (state === 'customer') return res.redirect(`${baseUrl}/customer`);

    // Fallback: nếu không có state thì redirect theo role user (dành cho tk cũ)
    if (user.role === UserRole.ADMIN) {
      return res.redirect(`${baseUrl}/admin`);
    } else if (user.role === UserRole.TASKER) {
      return res.redirect(`${baseUrl}/tasker`);
    }
    return res.redirect(`${baseUrl}/customer`);
  }
}
