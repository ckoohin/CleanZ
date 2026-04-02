import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthFacebookService } from './auth-facebook.service';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { CreateOAuthUserDto } from '../users/dto/create-oauth-user.dto';
import { CookieHelper } from 'src/common/helpers/cookie.helper';

@Controller('auth/facebook')
export class AuthFacebookController {
  constructor(
    private readonly authFacebookService: AuthFacebookService,
    private readonly configService: ConfigService,
    private readonly cookieHelper: CookieHelper,
  ) {}

  @Get()
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // Chuyển hướng sang trang đăng nhập Facebook
  }

  @Get('callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthCallback(
    @Req() req: { user: CreateOAuthUserDto },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens } = await this.authFacebookService.handleFacebookLogin(
      req.user,
    );

    this.cookieHelper.setTokenCookies(res, tokens);

    return res.redirect(this.configService.getOrThrow<string>('FRONTEND_URL'));
  }
}
