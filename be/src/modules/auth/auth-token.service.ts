import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';

import { User } from '../users/entities/user.entity';
import { Tokens } from './types/AuthResponse';
import { JwtPayload } from './types/JwtPayLoad';
import { TokenService } from '../token/token.service';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {}

  async generateTokens(user: User): Promise<Tokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword ?? false,
      tokenVersion: user.tokenVersion ?? 0,
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

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { access_token, refresh_token };
  }

  async saveRefreshToken(user: User, rawRefreshToken: string): Promise<void> {
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as StringValue;

    const expiresInMs = ms(refreshExpiresIn);

    await this.tokenService.createRefreshToken(
      user,
      rawRefreshToken,
      expiresInMs,
    );
  }

  async generateAndSaveTokens(user: User): Promise<Tokens> {
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user, tokens.refresh_token);
    return tokens;
  }
}
