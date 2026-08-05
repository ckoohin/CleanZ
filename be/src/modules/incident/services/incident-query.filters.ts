import { SelectQueryBuilder } from 'typeorm';
import {
  vietnamStartOfDay,
  vietnamEndOfDayExclusive,
} from 'src/common/helpers/vietnam-time.helper';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { QueryAdminIncidentDto } from '../dto/query-admin-incident.dto';

/**
 * Sự cố đang vi phạm hạn ra quyết định.
 *
 * Dùng `now()` của DB chứ không phải đồng hồ app: chính DB sinh ra
 * `decision_due_at`, nên so bằng đồng hồ khác là hàng đợi lệch đúng bằng độ
 * lệch giữa hai máy. Cả ba vế đều trả boolean (không trả NULL) nên `NOT (...)`
 * cho ra đúng phần bù.
 */
const OVERDUE_SQL =
  '(i.decision_due_at IS NOT NULL AND i.decision_due_at < now() AND i.status <> :closed)';

/**
 * Áp bộ lọc hàng đợi sự cố lên một QueryBuilder có alias `i`.
 *
 * Dùng CHUNG cho `IncidentAdminService.list` (màn hình hàng đợi) và
 * `IncidentReportService` (xuất Excel). Nút "Xuất danh sách" hứa trả về đúng
 * tập admin đang nhìn, nên hai đường không được có hai bản sao điều kiện lọc.
 *
 * Chỉ thêm `.andWhere()`, không bao giờ gọi `.where()` (sẽ xoá điều kiện đã set
 * trước đó), nên gọi ở vị trí nào trong chuỗi cũng an toàn.
 */
export function applyAdminIncidentFilters(
  qb: SelectQueryBuilder<IncidentEntity>,
  query: QueryAdminIncidentDto,
): void {
  if (query.status) qb.andWhere('i.status = :status', { status: query.status });
  if (query.severity) qb.andWhere('i.severity = :sev', { sev: query.severity });
  if (query.taskerId)
    qb.andWhere('i.tasker_id = :tid', { tid: query.taskerId });
  if (query.customerId)
    qb.andWhere('i.customer_id = :cid', { cid: query.customerId });
  // Hai nhánh dùng CHUNG một biểu thức, phủ định lẫn nhau, nên "Quá hạn" cộng
  // "Trong hạn" luôn đúng bằng "Tất cả" — kể cả sự cố chưa có hạn quyết định
  // (chưa tiếp nhận) hay đã đóng, vốn không thể coi là đang vi phạm hạn.
  if (query.overdue === 'true')
    qb.andWhere(OVERDUE_SQL, { closed: IncidentStatus.CLOSED });
  else if (query.overdue === 'false')
    qb.andWhere(`NOT ${OVERDUE_SQL}`, { closed: IncidentStatus.CLOSED });

  // Kỳ lọc theo NGÀY BÁO CÁO, không phải `created_at`: `reported_at` mới là
  // trục thời gian nghiệp vụ của sự cố (hàng đợi sắp theo nó, index cũng đặt
  // trên nó — xem migration 1787200000000). Khoảng nửa mở `[from, to)`.
  if (query.fromDate)
    qb.andWhere('i.reported_at >= :rFrom', {
      rFrom: vietnamStartOfDay(query.fromDate),
    });
  if (query.toDate)
    qb.andWhere('i.reported_at < :rTo', {
      rTo: vietnamEndOfDayExclusive(query.toDate),
    });
}

/**
 * Sắp xếp hàng đợi: severity, decisionDueAt (gần hạn trước), mặc định
 * reportedAt DESC.
 *
 * Luôn chốt bằng `i.id` ở cuối. Các khoá trên đều KHÔNG duy nhất (nhiều sự cố
 * cùng mức độ, cùng hạn), mà thứ tự của phần bằng nhau trong Postgres là không
 * xác định — không có tie-breaker thì phân trang có thể lặp/bỏ sót một bản ghi
 * giữa hai trang, và bản xuất Excel bị cắt ở trần dòng sẽ ra tập khác nhau giữa
 * hai lần bấm.
 */
export function applyAdminIncidentSort(
  qb: SelectQueryBuilder<IncidentEntity>,
  sort: QueryAdminIncidentDto['sort'],
): void {
  if (sort === 'severity') qb.orderBy('i.severity', 'ASC');
  else if (sort === 'decisionDueAt') qb.orderBy('i.decisionDueAt', 'ASC');
  else qb.orderBy('i.reportedAt', 'DESC');
  qb.addOrderBy('i.id', 'DESC');
}
