import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { CookieHelper } from 'src/common/helpers/cookie.helper';
import { CreateOAuthUserDto } from '../users/dto/create-oauth-user.dto';
import { AuthGoogleService } from './auth-google.service';

@Controller('auth/google')
export class AuthGoogleController {
  constructor(
    private readonly authGoogleService: AuthGoogleService,
    private readonly configService: ConfigService,
    private readonly cookieHelper: CookieHelper,
  ) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Chuyển hướng sang trang đăng nhập Google
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: { user: CreateOAuthUserDto },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens } = await this.authGoogleService.handleGoogleLogin(req.user);

    this.cookieHelper.setTokenCookies(res, tokens);

    return res.redirect(this.configService.getOrThrow<string>('FRONTEND_URL'));
  }
}
