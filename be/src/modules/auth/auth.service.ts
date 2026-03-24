import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { AuthResponse, Tokens } from './types/AuthResponse';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/index';
import { JwtPayload } from './types/JwtPayLoad';
import { UserProfileDto } from '../users/dto/user-profile.dto';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    return asyncHandleOperation(async () => {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existing) {
        throw new ConflictException('Email đã được sử dụng');
      }

      const user = this.userRepository.create(dto);
      await this.userRepository.save(user);

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return this.buildAuthResponse(user, tokens);
    }, 'Lỗi khi đăng kí');
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOne({
        where: { email: dto.email, isActive: true },
        select: ['id', 'email', 'role', 'password', 'isActive'],
      });
      if (!user) {
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
      }

      const isPasswordValid = await user.comparePassword(dto.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
      }

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return this.buildAuthResponse(user, tokens);
    }, 'Lỗi khi đăng nhập');
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.userRepository.update(userId, { refreshToken: null });
    return { message: 'Đăng xuất thành công' };
  }

  async refreshTokens(user: User): Promise<Tokens> {
    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return asyncHandleOperation(async () => {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'password', 'isActive'],
      });

      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }
      const isCurrentPasswordValid = await user.comparePassword(
        dto.currentPassword,
      );
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng');
      }

      user.password = dto.newPassword;
      await this.userRepository.save(user);

      await this.userRepository.update(userId, { refreshToken: null });

      return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
    }, 'Lỗi khi đổi mật khẩu');
  }

  private async generateTokens(user: User): Promise<Tokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets not defined');
    }

    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as StringValue;
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  private buildAuthResponse(user: User, tokens: Tokens): AuthResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      tokens,
    };
  }
}
