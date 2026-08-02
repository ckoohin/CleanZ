import { Injectable, Logger } from '@nestjs/common';
import {
  constants,
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from 'crypto';

/** Tiền tố đánh dấu giá trị đã mã hoá (versioned envelope). */
const PREFIX = 'enc:v1:';

/**
 * Trả về khi KHÔNG giải mã được (mất khoá, xoay khoá, ciphertext hỏng).
 * Trước đây trả chuỗi rỗng — không phân biệt được với "tin nhắn trống", nên cả
 * lịch sử chat có thể im lặng biến thành rỗng mà không ai nhận ra.
 */
export const DECRYPT_FAILED = '[Không giải mã được nội dung tin nhắn]';
const OAEP = {
  padding: constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: 'sha256' as const,
};

/** Chuẩn hoá PEM nạp từ .env (env hay escape newline thành `\n`). */
function normalizePem(raw?: string): string | null {
  if (!raw) return null;
  const pem = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
  return pem.trim() ? pem : null;
}

/**
 * Mã hoá nội dung tin nhắn ticket "at-rest" theo mô hình HYBRID (RSA + AES):
 *  - Mỗi tin sinh AES-256-GCM key ngẫu nhiên, mã hoá body.
 *  - AES key được BỌC (wrap) bằng RSA-OAEP public key rồi lưu kèm ciphertext.
 *  - Chỉ ai giữ RSA private key (server, qua .env) mới gỡ được AES key để giải mã.
 *
 * Mục tiêu: nếu DB/log/sao lưu bị lộ (mã độc, dump trái phép) thì body tin nhắn
 * vẫn là rác mã hoá — không leak nội dung. Admin/đương sự vẫn đọc bình thường vì
 * server giải mã đúng lúc trả response (mô hình admin trung gian giữ nguyên).
 *
 * Khoá cấu hình qua env: `TICKET_MSG_PUBLIC_KEY`, `TICKET_MSG_PRIVATE_KEY` (PEM).
 * Thiếu khoá → fallback lưu dạng thường (cảnh báo) để app & seed cũ vẫn chạy.
 */
@Injectable()
export class MessageCryptoService {
  private readonly logger = new Logger(MessageCryptoService.name);
  private readonly publicKey: string | null;
  private readonly privateKey: string | null;

  constructor() {
    this.publicKey = normalizePem(process.env.TICKET_MSG_PUBLIC_KEY);
    this.privateKey = normalizePem(process.env.TICKET_MSG_PRIVATE_KEY);
    if (!this.enabled) {
      // Ở production, thiếu khoá nghĩa là TOÀN BỘ nội dung khiếu nại được lưu
      // thô mà không ai hay biết — đó là sự cố bảo mật, không phải cảnh báo.
      // Dừng ngay lúc khởi động để lỗi cấu hình lộ ra trước khi có dữ liệu thật.
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Thiếu TICKET_MSG_PUBLIC_KEY/TICKET_MSG_PRIVATE_KEY — không thể bật mã hoá tin nhắn ticket at-rest.',
        );
      }
      this.logger.warn(
        'TICKET_MSG_PUBLIC_KEY/TICKET_MSG_PRIVATE_KEY chưa cấu hình — ' +
          'tin nhắn ticket sẽ lưu DẠNG THƯỜNG. Cấu hình cặp khoá RSA để bật mã hoá at-rest.',
      );
    }
  }

  get enabled(): boolean {
    return !!(this.publicKey && this.privateKey);
  }

  /** Mã hoá 1 chuỗi → envelope `enc:v1:<base64>`. Lỗi/không có khoá → trả nguyên. */
  encrypt(plain: string): string {
    if (plain == null || !this.publicKey) return plain;
    try {
      const aesKey = randomBytes(32);
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
      const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      const wrappedKey = publicEncrypt(
        { key: this.publicKey, ...OAEP },
        aesKey,
      );
      const envelope = {
        k: wrappedKey.toString('base64'),
        iv: iv.toString('base64'),
        t: tag.toString('base64'),
        c: ct.toString('base64'),
      };
      return PREFIX + Buffer.from(JSON.stringify(envelope)).toString('base64');
    } catch (e) {
      this.logger.error(
        'Mã hoá tin nhắn thất bại, lưu dạng thường',
        e as Error,
      );
      return plain;
    }
  }

  /** Giải mã envelope. Giá trị không có tiền tố (dữ liệu cũ/plaintext) → trả nguyên. */
  decrypt(stored: string): string {
    if (stored == null || !stored.startsWith(PREFIX)) return stored;
    if (!this.privateKey) {
      this.logger.error('Nhận ciphertext nhưng thiếu private key để giải mã');
      return DECRYPT_FAILED;
    }
    try {
      const json = Buffer.from(stored.slice(PREFIX.length), 'base64').toString(
        'utf8',
      );
      const env = JSON.parse(json) as {
        k: string;
        iv: string;
        t: string;
        c: string;
      };
      const aesKey = privateDecrypt(
        { key: this.privateKey, ...OAEP },
        Buffer.from(env.k, 'base64'),
      );
      const decipher = createDecipheriv(
        'aes-256-gcm',
        aesKey,
        Buffer.from(env.iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(env.t, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(env.c, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch (e) {
      this.logger.error('Giải mã tin nhắn thất bại', e as Error);
      return DECRYPT_FAILED;
    }
  }

  /** Giải mã in-place trường `body` của danh sách entity (tiện cho mapper). */
  decryptEntities<T extends { body: string }>(list: T[]): T[] {
    for (const m of list) m.body = this.decrypt(m.body);
    return list;
  }
}
