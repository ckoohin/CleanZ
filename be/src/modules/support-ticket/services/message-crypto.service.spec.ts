import { generateKeyPairSync } from 'crypto';
import { DECRYPT_FAILED, MessageCryptoService } from './message-crypto.service';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

describe('MessageCryptoService', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  function withKeys(): MessageCryptoService {
    process.env.TICKET_MSG_PUBLIC_KEY = publicKey;
    process.env.TICKET_MSG_PRIVATE_KEY = privateKey;
    return new MessageCryptoService();
  }

  it('mã hoá rồi giải mã trả lại đúng nội dung gốc', () => {
    const svc = withKeys();
    const plain = 'Thợ làm vỡ bình hoa của tôi — cần bồi thường.';
    const stored = svc.encrypt(plain);
    expect(stored).toMatch(/^enc:v1:/);
    expect(stored).not.toContain('bình hoa');
    expect(svc.decrypt(stored)).toBe(plain);
  });

  it('mỗi lần mã hoá cho ciphertext khác nhau (IV + khoá AES ngẫu nhiên)', () => {
    const svc = withKeys();
    expect(svc.encrypt('xin chào')).not.toBe(svc.encrypt('xin chào'));
  });

  it('dữ liệu cũ dạng plaintext (không có tiền tố) → trả nguyên', () => {
    const svc = withKeys();
    expect(svc.decrypt('tin nhắn cũ chưa mã hoá')).toBe(
      'tin nhắn cũ chưa mã hoá',
    );
  });

  it('ciphertext hỏng → marker rõ ràng, KHÔNG phải chuỗi rỗng', () => {
    const svc = withKeys();
    // Chuỗi rỗng lẫn với "tin nhắn trống" nên hỏng dữ liệu trở nên vô hình.
    expect(svc.decrypt('enc:v1:khong-phai-base64-hop-le')).toBe(DECRYPT_FAILED);
  });

  it('thiếu khoá ở môi trường dev → cảnh báo và lưu dạng thường', () => {
    delete process.env.TICKET_MSG_PUBLIC_KEY;
    delete process.env.TICKET_MSG_PRIVATE_KEY;
    process.env.NODE_ENV = 'development';
    const svc = new MessageCryptoService();
    expect(svc.enabled).toBe(false);
    expect(svc.encrypt('abc')).toBe('abc');
  });

  it('thiếu khoá ở PRODUCTION → ném lỗi ngay lúc khởi tạo', () => {
    delete process.env.TICKET_MSG_PUBLIC_KEY;
    delete process.env.TICKET_MSG_PRIVATE_KEY;
    process.env.NODE_ENV = 'production';
    // Im lặng lưu plaintext ở production là sự cố bảo mật, không phải cảnh báo.
    expect(() => new MessageCryptoService()).toThrow(/TICKET_MSG_PUBLIC_KEY/);
  });
});
