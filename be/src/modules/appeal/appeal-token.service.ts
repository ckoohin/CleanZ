import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';

/** Mục đích của token kháng cáo — phân biệt với các token mục đích khác. */
const APPEAL_TOKEN_PURPOSE = 'tasker-appeal';

export interface AppealTokenPayload {
  /** id của tasker (taskers.id). */
  sub: string;
  /** id user của tasker (users.id) — dùng làm reporter của ticket. */
  userId: string;
  purpose: typeof APPEAL_TOKEN_PURPOSE;
}

/**
 * Ký & xác thực token kháng cáo nhúng trong link email khi tasker bị khóa
 * vĩnh viễn. Tách riêng (không phụ thuộc Tasker/SupportTicket) để cả
 * TaskerModule (sinh URL lúc ban) lẫn AppealModule (verify lúc submit) dùng
 * chung mà không tạo circular dependency.
 */
@Injectable()
export class AppealTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get secret(): string {
    return (
      this.configService.get<string>('JWT_APPEAL_SECRET') ??
      // Fallback: dùng chung secret xác thực email nếu chưa cấu hình riêng.
      this.configService.get<string>('JWT_VERIFY_EMAIL_SECRET') ??
      'appeal-secret'
    );
  }

  private get expiresIn(): StringValue {
    return (this.configService.get<string>('JWT_APPEAL_EXPIRES_IN') ??
      '14d') as StringValue;
  }

  /** Ký token kháng cáo cho 1 tasker. */
  sign(taskerId: string, userId: string): string {
    const payload: AppealTokenPayload = {
      sub: taskerId,
      userId,
      purpose: APPEAL_TOKEN_PURPOSE,
    };
    return this.jwtService.sign(payload, {
      secret: this.secret,
      expiresIn: this.expiresIn,
    });
  }

  /** Xác thực token — ném lỗi nếu sai/hết hạn/sai mục đích. */
  verify(token: string): AppealTokenPayload {
    const payload = this.jwtService.verify<AppealTokenPayload>(token, {
      secret: this.secret,
    });
    if (payload.purpose !== APPEAL_TOKEN_PURPOSE) {
      throw new Error('Token không đúng mục đích kháng cáo');
    }
    return payload;
  }

  /** Dựng URL trang kháng cáo phía FE từ token. */
  buildAppealUrl(token: string): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      `http://localhost:${this.configService.get<number>('PORT') || 5000}`;
    return `${frontendUrl}/appeal?token=${token}`;
  }
}
