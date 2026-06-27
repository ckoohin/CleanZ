import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThanOrEqual } from 'typeorm';
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
      expiresAt: expiresAt,
      isUsed: false,
    });
    return this.tokenRepository.save(token);
  }

  // Số refresh token còn hiệu lực tối đa giữ lại cho mỗi user. Giữ vài token để
  // hỗ trợ đa thiết bị/đa tab và refresh đồng thời, nhưng có trần để bảng không
  // phình to và validateRefreshToken không phải bcrypt.compare quá nhiều bản ghi.
  private static readonly MAX_ACTIVE_REFRESH_TOKENS = 5;

  async createRefreshToken(
    user: User,
    rawToken: string,
    expiresInMs: number,
  ): Promise<Token> {
    // KHÔNG xoá sạch toàn bộ refresh token của user khi xoay vòng. Nếu xoá hết,
    // một phiên refresh đồng thời (đa tab / request song song trong cùng trang)
    // sẽ validate phải token vừa bị xoá → 401 → clearTokenCookies làm văng phiên
    // giữa chừng (biểu hiện: phía admin treo loading / bị đăng xuất oan khi
    // refresh token). Thay vào đó chỉ dọn token hết hạn/đã dùng và giới hạn số
    // lượng — không bao giờ xoá token còn hiệu lực mới nhất.
    await this.pruneRefreshTokens(user.id);

    const hashedToken = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + expiresInMs);

    return this.createToken(user, TokenType.REFRESH, hashedToken, expiresAt);
  }

  /**
   * Dọn refresh token hết hạn/đã dùng và giữ tối đa MAX_ACTIVE_REFRESH_TOKENS
   * token mới nhất (xoá các token cũ nhất nếu vượt trần). An toàn với refresh
   * đồng thời vì luôn giữ lại token mới nhất.
   */
  private async pruneRefreshTokens(userId: string): Promise<void> {
    await this.tokenRepository.delete({
      user: { id: userId },
      type: TokenType.REFRESH,
      expiresAt: LessThanOrEqual(new Date()),
    });
    await this.tokenRepository.delete({
      user: { id: userId },
      type: TokenType.REFRESH,
      isUsed: true,
    });

    const active = await this.tokenRepository.find({
      where: { user: { id: userId }, type: TokenType.REFRESH },
      order: { createdAt: 'ASC' },
    });

    const overflow =
      active.length - (TokenService.MAX_ACTIVE_REFRESH_TOKENS - 1);
    if (overflow > 0) {
      const idsToDelete = active.slice(0, overflow).map((t) => t.id);
      await this.tokenRepository.delete(idsToDelete);
    }
  }

  async validateRefreshToken(
    rawToken: string,
    userId: string,
  ): Promise<Token | null> {
    const tokens = await this.tokenRepository.find({
      where: {
        user: { id: userId },
        type: TokenType.REFRESH,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
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
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.tokenRepository.update(tokenId, { isUsed: true });
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
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });
  }

  private static readonly MAX_OTP_ATTEMPTS = 5;

  /**
   * Ghi nhận 1 lần nhập sai OTP. Khi vượt ngưỡng MAX_OTP_ATTEMPTS thì vô hiệu
   * token (markAsUsed) để chống brute-force mã 6 số trong 5 phút. Trả về số lần
   * thử còn lại (0 = token đã bị vô hiệu, phải đăng nhập lại để lấy mã mới).
   */
  async recordFailedOtpAttempt(tokenId: string): Promise<number> {
    await this.tokenRepository.increment({ id: tokenId }, 'attempts', 1);
    const token = await this.tokenRepository.findOne({
      where: { id: tokenId },
    });
    const attempts = token?.attempts ?? TokenService.MAX_OTP_ATTEMPTS;
    const remaining = TokenService.MAX_OTP_ATTEMPTS - attempts;
    if (remaining <= 0) {
      await this.markAsUsed(tokenId);
      return 0;
    }
    return remaining;
  }
}
