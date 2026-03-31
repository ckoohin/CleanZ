import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Token } from './entities/token.entity';
import { TokenType } from 'src/common/enums/token-type.enum';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  async createToken(
    user: User,
    type: TokenType,
    tokenValue: string,
    expiresAt: Date,
  ): Promise<Token> {
    const token = this.tokenRepository.create({
      user,
      type,
      token: tokenValue,
      expires_at: expiresAt,
      is_used: false,
    });
    return this.tokenRepository.save(token);
  }

  async createRefreshToken(
    user: User,
    rawToken: string,
    expiresInMs: number,
  ): Promise<Token> {
    await this.revokeAllTokensByUser(user.id, TokenType.REFRESH);

    const hashedToken = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + expiresInMs);

    return this.createToken(user, TokenType.REFRESH, hashedToken, expiresAt);
  }

  async validateRefreshToken(
    rawToken: string,
    userId: string,
  ): Promise<Token | null> {
    const tokens = await this.tokenRepository.find({
      where: {
        user: { id: userId },
        type: TokenType.REFRESH,
        is_used: false,
        expires_at: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    for (const token of tokens) {
      const isValid = await bcrypt.compare(rawToken, token.token);
      if (isValid) {
        return token;
      }
    }

    return null;
  }

  async findValidToken(
    tokenValue: string,
    type: TokenType,
  ): Promise<Token | null> {
    return this.tokenRepository.findOne({
      where: {
        token: tokenValue,
        type,
        is_used: false,
        expires_at: MoreThan(new Date()),
      },
      relations: ['user'],
    });
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.tokenRepository.update(tokenId, { is_used: true });
  }

  async revokeAllTokensByUser(userId: string, type: TokenType): Promise<void> {
    await this.tokenRepository.delete({
      user: { id: userId },
      type,
    });
  }

  async createOtpToken(
    user: User,
    otpHash: string,
    expiresAt: Date,
  ): Promise<Token> {
    await this.revokeAllTokensByUser(user.id, TokenType.LOGIN_OTP);

    return this.createToken(user, TokenType.LOGIN_OTP, otpHash, expiresAt);
  }

  async findValidOtpTokens(userId: string): Promise<Token[]> {
    return this.tokenRepository.find({
      where: {
        user: { id: userId },
        type: TokenType.LOGIN_OTP,
        is_used: false,
        expires_at: MoreThan(new Date()),
      },
      relations: ['user'],
    });
  }
}
