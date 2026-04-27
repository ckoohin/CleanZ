import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyLoginOtpDto,
} from './dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Auth } from './decorators/auth.decorator';
import { Public } from './decorators/public.decorator';
import { CookieHelper } from 'src/common/helpers/cookie.helper';
import type { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieHelper: CookieHelper,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Đăng ký thành công, tài khoản chờ xác thực email',
  })
  @ApiBadRequestResponse({
    description: 'Payload không hợp lệ hoặc email đã tồn tại',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi lại email xác thực tài khoản' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({ description: 'Gửi lại email xác thực thành công' })
  @ApiBadRequestResponse({ description: 'Token không hợp lệ' })
  resendVerificationEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.resendVerificationEmail(dto.token);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực email tài khoản' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({ description: 'Xác thực email thành công' })
  @ApiBadRequestResponse({ description: 'Token không hợp lệ hoặc đã hết hạn' })
  verifyEmail(@Body() dto: { token: string }) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Đăng nhập thành công, trả về thông tin OTP' })
  @ApiUnauthorizedResponse({
    description: 'Thông tin đăng nhập không chính xác',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-login-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực OTP sau khi đăng nhập' })
  @ApiBody({ type: VerifyLoginOtpDto })
  @ApiOkResponse({ description: 'Xác thực OTP thành công và set cookie token' })
  @ApiBadRequestResponse({ description: 'OTP không hợp lệ hoặc đã hết hạn' })
  async verifyLoginOtp(
    @Body() dto: VerifyLoginOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens } = await this.authService.verifyLoginOtp(
      dto.userId,
      dto.otp,
    );

    this.cookieHelper.setTokenCookies(res, tokens);
    return { message: 'Đăng nhập thành công' };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @ApiCookieAuth('refresh-token-cookie')
  @ApiOkResponse({ description: 'Làm mới token thành công' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token không hợp lệ hoặc hết hạn',
  })
  async refreshTokens(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(user);

    this.cookieHelper.setTokenCookies(res, tokens);

    return { message: 'Làm mới token thành công' };
  }

  @Auth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống' })
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOkResponse({ description: 'Đăng xuất thành công và xóa cookie token' })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  logout(@Res({ passthrough: true }) res: Response) {
    this.cookieHelper.clearTokenCookies(res);
    return { message: 'Đăng xuất thành công' };
  }

  @Auth()
  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại từ token' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Lấy thông tin người dùng hiện tại thành công',
  })
  @ApiUnauthorizedResponse({ description: 'Token không hợp lệ' })
  getMe(@CurrentUser() user: string) {
    return user;
  }

  @Auth()
  @Get('profile')
  @ApiOperation({ summary: 'Lấy hồ sơ tài khoản hiện tại' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Lấy hồ sơ thành công' })
  @ApiUnauthorizedResponse({ description: 'Token không hợp lệ' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Auth()
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản hiện tại' })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Đổi mật khẩu thành công' })
  @ApiBadRequestResponse({
    description: 'Mật khẩu mới không hợp lệ hoặc không khớp xác nhận',
  })
  @ApiUnauthorizedResponse({ description: 'Token không hợp lệ' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu quên mật khẩu' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Đã gửi email hướng dẫn đặt lại mật khẩu' })
  @ApiBadRequestResponse({
    description: 'Email không hợp lệ hoặc tài khoản không tồn tại',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Đặt lại mật khẩu thành công' })
  @ApiBadRequestResponse({
    description: 'Token không hợp lệ hoặc mật khẩu không đạt yêu cầu',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
