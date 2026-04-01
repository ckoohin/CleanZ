import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { StringValue } from 'ms';

import { User } from '../users/entities/user.entity';
import { AuthResponse, Tokens } from './types/AuthResponse';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/index';
import { JwtPayload } from './types/JwtPayLoad';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { TokenService } from '../token/token.service';
import { Token } from '../token/entities/token.entity';
import { TokenType } from 'src/common/enums/token-type.enum';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      const user = await this.usersService.create(dto);

      const hash = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
        },
        {
          secret: this.configService.get<string>('JWT_VERIFY_EMAIL_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_VERIFY_EMAIL_EXPIRES_IN',
          ) as StringValue,
        },
      );

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        `http://localhost:${this.configService.get<number>('PORT') || 5000}`;
      const verificationUrl = `${frontendUrl}/verify-email?token=${hash}`;

      await this.mailService.sendVerificationEmail(
        user.email,
        user.fullName,
        verificationUrl,
      );

      return {
        message:
          'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        hash,
      };
    }, 'Lỗi khi đăng kí');
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      try {
        const payload = this.verifyToken(token, 'JWT_VERIFY_EMAIL_SECRET');
        const userId: string = payload.sub;

        await this.usersService.markAsVerified(userId);

        return {
          message: 'Xác thực email thành công. Bạn có thể đăng nhập.',
        };
      } catch {
        throw new BadRequestException(
          'Token xác thực không hợp lệ hoặc đã hết hạn.',
        );
      }
    }, 'Lỗi khi xác thực email');
  }

  async resendVerificationEmail(token: string): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      const payload = this.verifyToken(token, 'JWT_VERIFY_EMAIL_SECRET', {
        ignoreExpiration: true,
      });
      const email: string = payload.email;
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new BadRequestException('Email không tồn tại');
      }

      if (user.is_verified) {
        throw new BadRequestException('Email đã được xác thực');
      }

      const hash = this.jwtService.sign(
        {
          sub: user.id,
        },
        {
          secret: this.configService.get<string>('JWT_VERIFY_EMAIL_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_VERIFY_EMAIL_EXPIRES_IN',
          ) as StringValue,
        },
      );

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        `http://localhost:${this.configService.get<number>('PORT') || 5000}`;
      const verificationUrl = `${frontendUrl}/verify-email?token=${hash}`;

      await this.mailService.sendVerificationEmail(
        user.email,
        user.fullName,
        verificationUrl,
      );

      return {
        message:
          'Gửi lại email xác thực thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        hash,
      };
    }, 'Lỗi khi gửi lại email xác thực');
  }

  async login(dto: LoginDto): Promise<{ message: string; userId: string }> {
    return asyncHandleOperation(async () => {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user || !user.password) {
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
      }

      const isPasswordValid = await this.comparePassword(
        dto.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
      }

      if (!user.is_verified) {
        throw new BadRequestException(
          'Email chưa được xác thực. Vui lòng kiểm tra hộp thư để xác thực.',
        );
      }

      if (!user.is_active) {
        throw new BadRequestException(
          'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
        );
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await this.tokenService.createOtpToken(user, otpHash, expiresAt);

      await this.mailService.sendLoginOtpEmail(user.email, user.fullName, otp);

      return {
        message: 'Mã OTP đã được gửi đến email của bạn.',
        userId: user.id,
        otp,
      };
    }, 'Lỗi khi đăng nhập');
  }

  async verifyLoginOtp(userId: string, otp: string): Promise<AuthResponse> {
    return asyncHandleOperation(async () => {
      const otpTokens = await this.tokenService.findValidOtpTokens(userId);

      if (!otpTokens.length) {
        throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn.');
      }

      let validToken: Token | null = null;
      for (const token of otpTokens) {
        const isValid = await bcrypt.compare(otp, token.token);
        if (isValid) {
          validToken = token;
          break;
        }
      }

      if (!validToken) {
        throw new BadRequestException('Mã OTP không đúng.');
      }

      await this.tokenService.markAsUsed(validToken.id);

      const user = validToken.user;
      await this.usersService.updateLastLogin(user.id);

      const tokens = await this.authTokenService.generateAndSaveTokens(user);

      return { user, tokens };
    }, 'Lỗi khi xác thực OTP');
  }

  async logout(userId: string): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      await this.tokenService.revokeAllTokensByUser(userId, TokenType.REFRESH);
      return { message: 'Đăng xuất thành công' };
    }, 'Lỗi khi đăng xuất');
  }

  async refreshTokens(user: User): Promise<Tokens> {
    return asyncHandleOperation(async () => {
      return this.authTokenService.generateAndSaveTokens(user);
    }, 'Lỗi khi làm mới token');
  }

  async getProfile(userId: string): Promise<User> {
    return asyncHandleOperation(async () => {
      const user = await this.usersService.findOne(userId);
      return user;
    }, 'Lỗi khi lấy thông tin cá nhân');
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException('Xác nhận mật khẩu không khớp');
      }

      const user = await this.usersService.findOne(userId);
      if (!user.password) {
        throw new BadRequestException(
          'Tài khoản này được đăng ký qua Google và chưa thiết lập mật khẩu.',
        );
      }

      const isCurrentPasswordValid = await this.comparePassword(
        dto.currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng');
      }

      await this.usersService.changePassword(userId, dto.newPassword);

      await this.tokenService.revokeAllTokensByUser(userId, TokenType.REFRESH);

      return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
    }, 'Lỗi khi đổi mật khẩu');
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        return {
          message:
            'Nếu email tồn tại, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.',
        };
      }

      const resetToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_RESET_PASSWORD_EXPIRES_IN',
          ) as StringValue,
        },
      );

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3001';
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

      await this.mailService.sendResetPasswordEmail(
        user.email,
        user.fullName,
        resetUrl,
      );

      return {
        message:
          'Nếu email tồn tại, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.',
      };
    }, 'Lỗi khi gửi email đặt lại mật khẩu');
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException('Xác nhận mật khẩu không khớp');
      }

      try {
        const payload = this.verifyToken(
          dto.token,
          'JWT_RESET_PASSWORD_SECRET',
        );

        const userId: string = payload.sub;

        await this.usersService.changePassword(userId, dto.newPassword);

        await this.tokenService.revokeAllTokensByUser(
          userId,
          TokenType.REFRESH,
        );

        return {
          message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
        };
      } catch {
        throw new BadRequestException(
          'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
        );
      }
    }, 'Lỗi khi đặt lại mật khẩu');
  }

  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private verifyToken(
    token: string,
    secret: string,
    option?: { ignoreExpiration?: boolean },
  ) {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>(secret),
        ...option,
      });
    } catch {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn.');
    }
  }
}
