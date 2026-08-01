import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthFacebookService } from './auth-facebook.service';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { CreateOAuthUserDto } from '../users/dto/create-oauth-user.dto';
import { CookieHelper } from 'src/common/helpers/cookie.helper';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';

@Controller('auth/facebook')
@ApiTags('Auth Facebook')
export class AuthFacebookController {
  constructor(
    private readonly authFacebookService: AuthFacebookService,
    private readonly configService: ConfigService,
    private readonly cookieHelper: CookieHelper,
  ) {}

  @Get()
  @UseGuards(FacebookAuthGuard)
  @ApiOperation({ summary: 'Khởi tạo đăng nhập Facebook OAuth' })
  @ApiOkResponse({ description: 'Redirect tới Facebook OAuth consent screen' })
  async facebookAuth() {
    // Chuyển hướng sang trang đăng nhập Facebook
  }

  @Get('callback')
  @UseGuards(FacebookAuthGuard)
  @ApiOperation({
    summary: 'Callback Facebook OAuth sau khi người dùng xác thực',
  })
  @ApiOkResponse({
    description:
      'Đăng nhập OAuth thành công, set cookie và redirect về frontend',
  })
  async facebookAuthCallback(
    @Req() req: { user: CreateOAuthUserDto; query: { state?: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authFacebookService.handleFacebookLogin(
      req.user,
    );

    const baseUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const state = req.query.state;

    if (state === 'admin' && user.role !== UserRole.ADMIN) {
      return res.redirect(`${baseUrl}/login-admin?error=UnauthorizedRole`);
    }
    if (state === 'tasker' && user.role !== UserRole.TASKER) {
      return res.redirect(`${baseUrl}/login-tasker?error=UnauthorizedRole`);
    }
    if (state === 'customer' && user.role !== UserRole.CUSTOMER) {
      return res.redirect(`${baseUrl}/login?error=UnauthorizedRole`);
    }

    this.cookieHelper.setTokenCookies(res, tokens);

    if (state === 'admin') return res.redirect(`${baseUrl}/admin`);
    if (state === 'tasker') return res.redirect(`${baseUrl}/tasker`);
    if (state === 'customer') return res.redirect(`${baseUrl}/customer`);

    if (user.role === UserRole.ADMIN) return res.redirect(`${baseUrl}/admin`);
    if (user.role === UserRole.TASKER) return res.redirect(`${baseUrl}/tasker`);
    return res.redirect(`${baseUrl}/customer`);
  }
}
