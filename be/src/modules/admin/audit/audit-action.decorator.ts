import { SetMetadata } from '@nestjs/common';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';

export const AUDIT_ACTION_KEY = 'audit:action';

export interface AuditExtractContext {
  /** Body của request, đã qua validation pipe. */
  body: Record<string, unknown>;
  /** Route params (`:id`, `:customerId`…). */
  params: Record<string, unknown>;
  /** Query string, hữu ích cho các thao tác ĐỌC/export. */
  query: Record<string, unknown>;
  /**
   * Payload trả về của handler, đã bóc lớp `{ data }` của `successResponse`.
   * `null` khi handler ném lỗi — extractor phải chịu được trường hợp này.
   */
  result: Record<string, unknown> | null;
}

export interface AuditActionOptions {
  /** Lấy từ `AuditActionCode`. Đã phát hành thì không đổi. */
  code: string;
  severity: AuditSeverity;
  /** Loại đối tượng bị tác động: 'WALLET' | 'INCIDENT' | 'USER'… */
  targetType?: string;
  /** Tên field trong body chứa lý do do admin nhập. */
  reasonField?: string;
  /**
   * Tên field trong body chứa danh sách id bị tác động, cho thao tác hàng loạt
   * (`ticketIds`, `bookingIds`…). Không khai báo thì `affected_ids` để trống.
   */
  affectedIdsField?: string;
  /**
   * Rút các trường NGHIỆP VỤ có cấu trúc (số tiền, số dư trước/sau, id bút toán)
   * vào cột `business_data`.
   *
   * Đây là lý do decorator tồn tại. Diff before/after của
   * `AdminActivitySnapshotService` chỉ đúng khi hành động = "sửa một row của một
   * entity". Những thao tác đáng ghi nhất lại không có hình dạng đó: điều chỉnh ví
   * tạo bút toán MỚI và đổi `wallets.balance`; xoá nợ đụng `tasker_debts`; gán
   * hàng loạt sửa N ticket mà route không có `:id` nào. Với chúng, diff cho ra
   * rỗng hoặc vô nghĩa, nên phải khai báo tường minh cần ghi lại cái gì.
   *
   * Extractor được gọi trong khối try/catch — ném lỗi ở đây không làm hỏng
   * request, chỉ mất phần `business_data`.
   */
  extract?: (ctx: AuditExtractContext) => Record<string, unknown> | null;
}

/**
 * Khai báo ngữ nghĩa audit cho một handler admin.
 *
 * Không bắt buộc: handler không gắn decorator vẫn được ghi log y như trước
 * (mã `GENERIC.*`, severity `NORMAL`). Chỉ những nghiệp vụ trọng yếu mới cần khai
 * báo — mục tiêu là nâng CHẤT LƯỢNG log ở chỗ cần, không phải bắt mọi endpoint
 * phải bảo trì thêm metadata.
 *
 * Gắn decorator lên handler `GET` là cách duy nhất để audit một hành động ĐỌC —
 * và phải rất tiết chế. Chỉ ba loại đọc xứng đáng: đưa dữ liệu RA KHỎI hệ thống
 * (export), xem giấy tờ tuỳ thân của một người, xem thông tin thanh toán của một
 * người. Danh sách và màn hình tra cứu thường ngày thì KHÔNG: một admin làm việc
 * bình thường sẽ sinh hàng trăm dòng mỗi ngày, giá trị điều tra gần bằng không,
 * và chúng chôn vùi đúng những dòng đáng đọc. Chi phí lưu trữ chỉ là hệ quả phụ;
 * cái mất lớn hơn là nhật ký không còn ai đọc nổi.
 */
export const AuditAction = (options: AuditActionOptions) =>
  SetMetadata(AUDIT_ACTION_KEY, options);
