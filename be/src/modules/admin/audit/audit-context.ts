import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContextValue {
  /** Khoá nối một thao tác admin với mọi thay đổi dữ liệu nó gây ra. */
  correlationId: string;
  actorUserId: string;
  actorEmail: string;
  method: string;
  path: string;
  handler: string;
  resource: string;
  startedAt: number;
  /**
   * Service đã tự ghi nhật ký NGAY TRONG transaction nghiệp vụ của mình.
   *
   * Cờ này là cách hai tầng ghi log tránh dẫm chân nhau. Với các lệnh chuyển tiền
   * thật, service enqueue bản ghi cùng transaction để "tiền đã chuyển" và "log đã
   * ghi" cùng sống hoặc cùng chết. Interceptor thấy cờ thì thôi, khỏi ghi trùng.
   * Nếu transaction rollback, cờ cũng biến mất theo — và interceptor ghi lại
   * đúng cái cần ghi: một lần thử bất thành.
   */
  recordedInTransaction?: boolean;
}

const storage = new AsyncLocalStorage<AuditContextValue>();

/**
 * Ngữ cảnh audit của request hiện hành.
 *
 * Vì sao `AsyncLocalStorage` chứ không truyền tham số? Vì `correlationId` cần đi
 * tới những chỗ rất sâu — `CompensationExecutorService` ghi bút toán ví, rồi ghi
 * nợ Tasker, rồi ghi `incident_status_logs` — và truyền tay sẽ phải sửa chữ ký
 * của hàng chục hàm chỉ để chuyển một chuỗi mà không hàm nào trong số đó quan tâm.
 * Đổi lại, chỗ nào đọc cũng phải chịu được `null`: worker nền và cron chạy ngoài
 * request nên không có ngữ cảnh, và đó là trạng thái HỢP LỆ chứ không phải lỗi.
 */
export const AuditContext = {
  run<T>(value: AuditContextValue, fn: () => T): T {
    return storage.run(value, fn);
  },

  /**
   * Dùng từ interceptor. `run()` không hợp ở đó: interceptor chỉ DỰNG chuỗi
   * Observable rồi trả về, còn handler thật sự chạy lúc Nest subscribe — tức là
   * sau khi callback của `run()` đã kết thúc và store đã bị gỡ. `enterWith` gắn
   * store vào chính async context hiện tại nên nó sống tiếp tới lúc subscribe.
   */
  enter(value: AuditContextValue): void {
    storage.enterWith(value);
  },

  correlationId(): string | null {
    return storage.getStore()?.correlationId ?? null;
  },

  actorUserId(): string | null {
    return storage.getStore()?.actorUserId ?? null;
  },

  current(): AuditContextValue | null {
    return storage.getStore() ?? null;
  },

  markRecordedInTransaction(): void {
    const store = storage.getStore();
    if (store) store.recordedInTransaction = true;
  },

  wasRecordedInTransaction(): boolean {
    return storage.getStore()?.recordedInTransaction === true;
  },
};
