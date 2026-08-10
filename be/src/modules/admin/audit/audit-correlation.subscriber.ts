import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { AuditActorType } from 'src/common/enums/audit-actor-type.enum';
import { AuditContext } from './audit-context';

/** Bảng nào mang cột `audit_correlation_id`. Khớp với migration 1787900000000. */
const CORRELATED_TABLES = new Set([
  'wallet_transactions',
  'booking_status_logs',
  'incident_status_logs',
  'ticket_status_logs',
  'tasker_debts',
  'tasker_penalties',
]);

/** Bảng nào mang thêm `actor_type`. Khớp với migration 1788200000000. */
const ACTOR_TYPED_TABLES = new Set([
  'booking_status_logs',
  'incident_status_logs',
  'ticket_status_logs',
]);

/**
 * Đóng dấu `audit_correlation_id` lên mọi bản ghi hệ quả được INSERT trong phạm vi
 * một thao tác admin.
 *
 * Vì sao là subscriber chứ không sửa từng service? Vì các bảng này được ghi từ
 * hơn hai chục chỗ (`customer-booking`, `tasker-booking`, `booking-settlement`,
 * `compensation-executor`, `ticket.service`…). Sửa tay từng chỗ thì mỗi service
 * mới thêm về sau lại là một lỗ thủng im lặng — và lỗ thủng trong audit thì không
 * có test nào tự nhiên bắt được, vì nghiệp vụ vẫn chạy đúng.
 *
 * Chỉ móc vào INSERT: các bảng này đều là sổ ghi chỉ-thêm. Đóng dấu khi UPDATE sẽ
 * viết đè nguồn gốc của một bản ghi cũ bằng thao tác đang chạy — tức là làm sai
 * lệch đúng thứ mà cột này sinh ra để bảo toàn.
 *
 * Đăng ký qua `subscribers` trong `database.config.ts`, không qua DI của Nest.
 * Nếu đi đường DI thì subscriber phải nhận `DataSource` để tự đẩy mình vào
 * `dataSource.subscribers`, kéo theo việc module chứa nó phải phụ thuộc TypeORM
 * root — cái giá quá đắt cho một lớp không cần bất kỳ dependency nào.
 */
@EventSubscriber()
export class AuditCorrelationSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    const table = event.metadata.tableName;
    if (!CORRELATED_TABLES.has(table)) return;

    const correlationId = AuditContext.correlationId();

    if (ACTOR_TYPED_TABLES.has(table)) {
      this.stampActorType(event.entity, Boolean(correlationId));
    }

    // Ngoài request admin (khách/Tasker tự thao tác, cron, worker) thì không có
    // ngữ cảnh — để NULL, đúng nghĩa "không phát sinh từ thao tác admin nào".
    if (!correlationId) return;

    // Không ghi đè giá trị service đã tự đặt: chỗ nào chủ động gán là chỗ đó biết
    // rõ hơn subscriber về nguồn gốc thật của bản ghi.
    if (event.entity.auditCorrelationId) return;
    event.entity.auditCorrelationId = correlationId;
  }

  /**
   * Phân loại actor từ hai tín hiệu đã có sẵn, không cần đọc thêm DB:
   *
   * - Trong ngữ cảnh admin  → `ADMIN`.
   * - Ngoài ngữ cảnh admin nhưng có người được gán  → `USER` (chính chủ thao tác).
   * - Không có cả hai  → `SYSTEM`: cron, worker, hoặc quy tắc nghiệp vụ tự chạy.
   *
   * Nhánh cuối chính là lý do cột này tồn tại. Trước đây `changed_by_user_id`
   * NULL vừa có nghĩa "hệ thống tự làm" vừa có nghĩa "quên truyền actor", và
   * người điều tra không có cách nào phân biệt.
   */
  private stampActorType(
    entity: Record<string, unknown>,
    inAdminContext: boolean,
  ): void {
    if (entity.actorType) return;

    if (inAdminContext) {
      entity.actorType = AuditActorType.ADMIN;
      return;
    }

    const changedBy = entity.changedByUser ?? entity.changedBy;
    entity.actorType = changedBy ? AuditActorType.USER : AuditActorType.SYSTEM;
  }
}
