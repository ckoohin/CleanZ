import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateIncidentDto } from './create-incident.dto';
import { CreateFromTicketDto } from './create-from-ticket.dto';
import { SubmitStatementDto } from './submit-statement.dto';
import { QueryIncidentDto } from './query-incident.dto';
import { SaveIncidentDecisionDto } from './save-incident-decision.dto';
import { IC_INPUT_LIMITS } from '../incident.constants';

/**
 * Chạy VALIDATION THẬT qua class-validator thay vì đọc decorator: `@ValidateNested` chỉ có
 * tác dụng khi đi kèm `@Type`, và các ràng buộc lồng nhau rất dễ im lặng vô hiệu khi thiếu
 * một mảnh — đọc bằng mắt không phát hiện được.
 */
function errorsOf(cls: new () => object, payload: unknown): string[] {
  const instance = plainToInstance(cls, payload);
  return validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  }).flatMap((e) => [
    ...Object.keys(e.constraints ?? {}),
    ...(e.children ?? []).flatMap((c) =>
      (c.children ?? []).flatMap((cc) => Object.keys(cc.constraints ?? {})),
    ),
  ]);
}

const item = (over: Record<string, unknown> = {}) => ({
  description: 'Vỡ mặt kính bàn trà',
  claimedAmount: 500_000,
  evidenceIds: ['11111111-1111-4111-8111-111111111111'],
  ...over,
});

const createPayload = (over: Record<string, unknown> = {}) => ({
  bookingId: '22222222-2222-4222-8222-222222222222',
  title: 'Hư hỏng tài sản',
  description: 'Mô tả hợp lệ',
  damageItems: [item()],
  ...over,
});

describe('Hạn mức đầu vào của sự cố', () => {
  describe('CreateIncidentDto', () => {
    it('payload hợp lệ đi qua', () => {
      expect(errorsOf(CreateIncidentDto, createPayload())).toEqual([]);
    });

    it('mô tả dài vô hạn bị chặn', () => {
      const errors = errorsOf(
        CreateIncidentDto,
        createPayload({
          description: 'x'.repeat(IC_INPUT_LIMITS.DESCRIPTION_MAX + 1),
        }),
      );
      expect(errors).toContain('maxLength');
    });

    /** Không chặn thì một request mở transaction hàng nghìn INSERT và thổi phồng hold ví. */
    it('quá nhiều hạng mục bị chặn', () => {
      const errors = errorsOf(
        CreateIncidentDto,
        createPayload({
          damageItems: Array.from(
            { length: IC_INPUT_LIMITS.DAMAGE_ITEMS_MAX + 1 },
            () => item(),
          ),
        }),
      );
      expect(errors).toContain('arrayMaxSize');
    });

    it('quá nhiều ảnh cho một hạng mục bị chặn', () => {
      const errors = errorsOf(
        CreateIncidentDto,
        createPayload({
          damageItems: [
            item({
              evidenceIds: Array.from(
                { length: IC_INPUT_LIMITS.EVIDENCE_MAX + 1 },
                (_, i) =>
                  `1111111${i % 10}-1111-4111-8111-111111111111`.slice(0, 36),
              ),
            }),
          ],
        }),
      );
      expect(errors).toContain('arrayMaxSize');
    });

    /**
     * Trần THẬT là `INCIDENT_CLAIM_MAX_AMOUNT` (config, áp cho TỔNG). Decorator chỉ chặn số
     * phi lý — nếu nó chép trần chính sách thì hạ config sẽ không có tác dụng.
     */
    it('số tiền phi lý bị chặn, nhưng ngưỡng chặn KHÔNG phải trần chính sách', () => {
      expect(
        errorsOf(
          CreateIncidentDto,
          createPayload({
            damageItems: [
              item({ claimedAmount: IC_INPUT_LIMITS.AMOUNT_SANITY_MAX + 1 }),
            ],
          }),
        ),
      ).toContain('max');

      // Trên trần chính sách mặc định (20tr) nhưng dưới ngưỡng vệ sinh → DTO cho qua,
      // service mới là nơi từ chối. Đây chính là ranh giới cần giữ.
      expect(
        errorsOf(
          CreateIncidentDto,
          createPayload({ damageItems: [item({ claimedAmount: 50_000_000 })] }),
        ),
      ).toEqual([]);
    });
  });

  describe('CreateFromTicketDto', () => {
    it('áp cùng hạn mức như luồng khách tự báo cáo', () => {
      const errors = errorsOf(CreateFromTicketDto, {
        title: 'Nâng cấp từ ticket',
        description: 'x'.repeat(IC_INPUT_LIMITS.DESCRIPTION_MAX + 1),
        damageItems: Array.from(
          { length: IC_INPUT_LIMITS.DAMAGE_ITEMS_MAX + 1 },
          () => ({ description: 'hạng mục', claimedAmount: 100_000 }),
        ),
      });
      expect(errors).toEqual(
        expect.arrayContaining(['maxLength', 'arrayMaxSize']),
      );
    });
  });

  describe('QueryIncidentDto', () => {
    it('trang quá lớn bị chặn — không vét sạch bảng trong một request', () => {
      expect(errorsOf(QueryIncidentDto, { limit: 999_999 })).toContain('max');
    });

    it('trang trong hạn vẫn đi qua', () => {
      expect(
        errorsOf(QueryIncidentDto, {
          limit: IC_INPUT_LIMITS.PAGE_SIZE_MAX,
          page: 2,
        }),
      ).toEqual([]);
    });
  });

  describe('SubmitStatementDto', () => {
    it('đính kèm quá nhiều ảnh bị chặn', () => {
      expect(
        errorsOf(SubmitStatementDto, {
          body: 'Giải trình của Tasker',
          evidenceIds: Array.from(
            { length: IC_INPUT_LIMITS.EVIDENCE_MAX + 1 },
            () => '11111111-1111-4111-8111-111111111111',
          ),
        }),
      ).toContain('arrayMaxSize');
    });
  });

  describe('SaveIncidentDecisionDto', () => {
    it('số tiền duyệt phi lý bị chặn ngay ở tầng DTO', () => {
      const errors = errorsOf(SaveIncidentDecisionDto, {
        expectedDecisionVersion: 1,
        outcome: 'COMPENSATE',
        items: [
          {
            damageItemId: '33333333-3333-4333-8333-333333333333',
            approvedAmount: IC_INPUT_LIMITS.AMOUNT_SANITY_MAX + 1,
          },
        ],
        responsibilityParty: 'TASKER',
        responsibilityReason: 'Tasker gây thiệt hại trực tiếp',
        taskerBorneAmount: IC_INPUT_LIMITS.AMOUNT_SANITY_MAX + 1,
        platformBorneAmount: 0,
        customerDecisionSummary: 'CleanZ duyệt bồi thường theo thẩm định.',
      });
      expect(errors).toContain('max');
    });
  });
});
