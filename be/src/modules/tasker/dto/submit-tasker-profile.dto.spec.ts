import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SubmitTaskerProfileDto } from './submit-tasker-profile.dto';
import { TaskerDocumentType } from 'src/common/enums/type-docs-tasker.enum';

/**
 * ValidationPipe toàn cục bật `whitelist` + `forbidNonWhitelisted`
 * (`src/common/utils/validation-options.ts`), nên MỌI field wizard đăng ký gửi lên
 * mà DTO không khai báo sẽ làm cả request hỏng với 422 — tasker không nộp được hồ sơ.
 *
 * Danh sách dưới đây bám theo `payload.append(...)` của
 * `fe/src/features/tasker/_components/PartnerSignupWizard.tsx` và
 * `TaskerRegistrationWizard.tsx`. Ảnh (avatar/docFront/docBack/...) đi qua
 * FileFieldsInterceptor nên không nằm trong DTO body.
 */
const FIELDS_SENT_BY_WIZARD = [
  'workingAddress',
  'bio',
  'experience',
  'skills',
  'phone',
  'docType',
  'docIdNumber',
  'bankName',
  'bankAccountNumber',
  'bankAccountName',
  'bankBin',
] as const;

/** Hồ sơ hợp lệ tối thiểu — chỉ các field bắt buộc. */
const validPayload = {
  phone: '0901234567',
  docType: TaskerDocumentType.CITIZEN_ID,
  docIdNumber: '079203001234',
};

describe('SubmitTaskerProfileDto', () => {
  it('nhận đủ mọi field mà wizard đăng ký gửi lên', async () => {
    const payload: Record<string, string> = { ...validPayload };
    for (const field of FIELDS_SENT_BY_WIZARD) {
      payload[field] ??= 'x';
    }
    payload.docType = TaskerDocumentType.CITIZEN_ID;

    const dto = plainToInstance(SubmitTaskerProfileDto, payload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    // Field không khai báo sẽ bị strip → so lại để chắc DTO thật sự giữ giá trị.
    for (const field of FIELDS_SENT_BY_WIZARD) {
      expect(dto).toHaveProperty(field);
    }
  });

  it('giữ được bankBin — PayOS bắt buộc mã BIN mới chi hộ được', async () => {
    // Thiếu field này thì hồ sơ nộp xong vẫn không rút được tiền: admin duyệt sẽ
    // vấp WITHDRAWAL_MISSING_BANK_BIN.
    const dto = plainToInstance(SubmitTaskerProfileDto, {
      ...validPayload,
      bankBin: ' 970436 ',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.bankBin).toBe('970436'); // @Transform đã trim
  });

  it('từ chối field lạ để lỗi lộ ra ngay ở tầng DTO', async () => {
    const dto = plainToInstance(SubmitTaskerProfileDto, {
      ...validPayload,
      truongKhongTonTai: 'x',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('truongKhongTonTai');
  });

  it('bắt buộc phone đúng định dạng Việt Nam', async () => {
    const dto = plainToInstance(SubmitTaskerProfileDto, {
      ...validPayload,
      phone: '84901234567',
    });
    const errors = await validate(dto);

    expect(errors.map((e) => e.property)).toContain('phone');
  });
});
