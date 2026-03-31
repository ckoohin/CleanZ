import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthFacebookService } from './auth-facebook.service';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import ms, { StringValue } from 'ms';
import { CreateFacebookUserDto } from '../users/dto/create-facebook-user.dto';

@Controller('auth/facebook')
export class AuthFacebookController {
  constructor(
    private readonly authFacebookService: AuthFacebookService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // Chuyển hướng sang trang đăng nhập Facebook
  }

  @Get('callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthCallback(
    @Req() req: { user: CreateFacebookUserDto },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens } = await this.authFacebookService.handleFacebookLogin(
      req.user,
    );

    const accessExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as StringValue;
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as StringValue;

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: ms(accessExpiresIn),
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: ms(refreshExpiresIn),
    });

    return res.redirect(this.configService.getOrThrow<string>('FRONTEND_URL'));
  }
}
