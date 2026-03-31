import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import ms, { StringValue } from 'ms';

import { AuthGoogleService } from './auth-google.service';
import { CreateGoogleUserDto } from '../users/dto/create-google-user.dto';

@Controller('auth/google')
export class AuthGoogleController {
  private readonly logger = new Logger(AuthGoogleController.name);

  constructor(
    private readonly authGoogleService: AuthGoogleService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Chuyển hướng sang trang đăng nhập Google
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: { user: CreateGoogleUserDto },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens } = await this.authGoogleService.handleGoogleLogin(req.user);

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
