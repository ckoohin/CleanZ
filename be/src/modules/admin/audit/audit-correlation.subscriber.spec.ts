import { InsertEvent } from 'typeorm';
import { AuditContext } from './audit-context';
import { AuditCorrelationSubscriber } from './audit-correlation.subscriber';

/**
 * Subscriber này hỏng theo kiểu IM LẶNG: nghiệp vụ vẫn chạy đúng, không test nào
 * khác đỏ, `audit_correlation_id` chỉ lặng lẽ NULL — và điều đó chỉ lộ ra vào
 * đúng lúc cần truy vết một vụ tranh chấp tiền bạc, tức là lúc đã quá muộn.
 */
describe('AuditCorrelationSubscriber', () => {
  const subscriber = new AuditCorrelationSubscriber();
  const CORRELATION_ID = '11111111-1111-4111-8111-111111111111';

  function eventFor(
    tableName: string,
    entity: Record<string, unknown> = {},
  ): InsertEvent<Record<string, unknown>> {
    return { metadata: { tableName }, entity } as InsertEvent<
      Record<string, unknown>
    >;
  }

  function withAdminRequest(fn: () => void) {
    AuditContext.run(
      {
        correlationId: CORRELATION_ID,
        actorUserId: 'admin-1',
        actorEmail: 'admin@cleanz.vn',
        method: 'POST',
        path: '/api/v1/admin/finance/transactions/adjustment',
        handler: 'FinanceController.createAdjustment',
        resource: 'tài chính',
        startedAt: Date.now(),
      },
      fn,
    );
  }

  it('đóng dấu correlationId lên bản ghi của bảng hệ quả', () => {
    const event = eventFor('wallet_transactions');
    withAdminRequest(() => subscriber.beforeInsert(event));
    expect(event.entity.auditCorrelationId).toBe(CORRELATION_ID);
  });

  it('bỏ qua bảng không nằm trong danh sách', () => {
    const event = eventFor('bookings');
    withAdminRequest(() => subscriber.beforeInsert(event));
    expect(event.entity.auditCorrelationId).toBeUndefined();
  });

  // Cron, worker và mọi thao tác do chính khách/Tasker thực hiện đều chạy ngoài
  // ngữ cảnh admin. NULL ở đây là câu trả lời ĐÚNG, không phải thiếu sót.
  it('để trống khi không có ngữ cảnh admin', () => {
    const event = eventFor('wallet_transactions');
    subscriber.beforeInsert(event);
    expect(event.entity.auditCorrelationId).toBeUndefined();
  });

  it('không ghi đè giá trị service đã tự đặt', () => {
    const explicit = '22222222-2222-4222-8222-222222222222';
    const event = eventFor('tasker_debts', {
      auditCorrelationId: explicit,
    });
    withAdminRequest(() => subscriber.beforeInsert(event));
    expect(event.entity.auditCorrelationId).toBe(explicit);
  });

  /**
   * Lý do cột `actor_type` tồn tại: trước đây `changed_by_user_id = NULL` vừa có
   * nghĩa "cron/worker tự chạy" vừa có nghĩa "quên truyền actor", và khi điều tra
   * thì đó là hai kết luận hoàn toàn khác nhau.
   */
  describe('actor_type', () => {
    it('đánh ADMIN khi ở trong ngữ cảnh admin', () => {
      const event = eventFor('booking_status_logs');
      withAdminRequest(() => subscriber.beforeInsert(event));
      expect(event.entity.actorType).toBe('ADMIN');
    });

    it('đánh USER khi có người thao tác nhưng ngoài ngữ cảnh admin', () => {
      const event = eventFor('booking_status_logs', {
        changedByUser: { id: 'customer-1' },
      });
      subscriber.beforeInsert(event);
      expect(event.entity.actorType).toBe('USER');
    });

    // Cron, worker, quy tắc nghiệp vụ tự kích hoạt — không ai bấm nút.
    it('đánh SYSTEM khi không có ngữ cảnh lẫn người thao tác', () => {
      const event = eventFor('incident_status_logs');
      subscriber.beforeInsert(event);
      expect(event.entity.actorType).toBe('SYSTEM');
    });

    it('nhận cả tên trường changedBy của bảng sự cố và phiếu hỗ trợ', () => {
      const event = eventFor('ticket_status_logs', {
        changedBy: { id: 'tasker-1' },
      });
      subscriber.beforeInsert(event);
      expect(event.entity.actorType).toBe('USER');
    });

    it('không gán cho bảng không có cột actor_type', () => {
      const event = eventFor('wallet_transactions');
      subscriber.beforeInsert(event);
      expect(event.entity.actorType).toBeUndefined();
    });

    it('không ghi đè giá trị service đã tự đặt', () => {
      const event = eventFor('booking_status_logs', { actorType: 'SYSTEM' });
      withAdminRequest(() => subscriber.beforeInsert(event));
      expect(event.entity.actorType).toBe('SYSTEM');
    });
  });

  /**
   * Interceptor dùng `enterWith`, KHÔNG phải `run` — `run` tự đóng scope khi
   * callback kết thúc, còn `enterWith` gắn store vào async context hiện tại và để
   * nó sống tiếp. Test bằng `run` sẽ luôn xanh dù cơ chế thật có rò hay không,
   * nên phải mô phỏng đúng `enterWith` trong một async context tách riêng.
   */
  it('không rò ngữ cảnh sang tác vụ chạy ngoài request', async () => {
    await new Promise<void>((resolve) => {
      setImmediate(() => {
        AuditContext.enter({
          correlationId: CORRELATION_ID,
          actorUserId: 'admin-1',
          actorEmail: 'admin@cleanz.vn',
          method: 'POST',
          path: '/api/v1/admin/finance/transactions/adjustment',
          handler: 'FinanceController.createAdjustment',
          resource: 'tài chính',
          startedAt: Date.now(),
        });
        const inside = eventFor('tasker_debts');
        subscriber.beforeInsert(inside);
        expect(inside.entity.auditCorrelationId).toBe(CORRELATION_ID);
        resolve();
      });
    });

    // Cron/worker chạy ở async context khác: không được thấy store của request trên.
    const later = eventFor('wallet_transactions');
    subscriber.beforeInsert(later);
    expect(later.entity.auditCorrelationId).toBeUndefined();
  });
});
