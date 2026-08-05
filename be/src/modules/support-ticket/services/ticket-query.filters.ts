import { SelectQueryBuilder } from 'typeorm';
import {
  vietnamStartOfDay,
  vietnamEndOfDayExclusive,
} from 'src/common/helpers/vietnam-time.helper';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { AdminQueryTicketDto } from '../dto/admin-query-ticket.dto';

/**
 * Áp bộ lọc hàng đợi ticket lên một QueryBuilder có alias `t`.
 *
 * Dùng CHUNG cho `TicketAdminService.list` (màn hình hàng đợi) và
 * `TicketReportService` (xuất Excel). Đây là điểm mấu chốt của tính năng xuất
 * file: nút "Xuất danh sách" hứa trả về đúng tập ticket admin đang nhìn, nên
 * hai đường không được có hai bản sao điều kiện lọc — lệch một dòng là file
 * tải về khác với bảng trên màn hình mà không ai phát hiện ra.
 *
 * Chỉ thêm `.andWhere()`, không bao giờ gọi `.where()` (sẽ xoá điều kiện đã set
 * trước đó), nên gọi ở vị trí nào trong chuỗi cũng an toàn.
 */
export function applyAdminTicketFilters(
  qb: SelectQueryBuilder<SupportTicketEntity>,
  query: AdminQueryTicketDto,
): void {
  if (query.status) qb.andWhere('t.status = :status', { status: query.status });
  if (query.priority)
    qb.andWhere('t.priority = :priority', { priority: query.priority });
  if (query.category)
    qb.andWhere('t.category = :category', { category: query.category });
  if (query.reporterUserId)
    qb.andWhere('t.reporter_user_id = :rid', { rid: query.reporterUserId });
  if (query.assignedAdminId)
    qb.andWhere('t.assigned_admin_id = :aid', { aid: query.assignedAdminId });
  if (query.bookingId)
    qb.andWhere('t.booking_id = :bid', { bid: query.bookingId });
  if (query.slaBreached !== undefined)
    qb.andWhere('t.sla_breached = :sb', { sb: query.slaBreached });
  if (query.keyword)
    qb.andWhere('(t.ticket_code ILIKE :kw OR t.subject ILIKE :kw)', {
      kw: `%${query.keyword}%`,
    });
  if (query.fromDate)
    qb.andWhere('t.created_at >= :cFrom', {
      cFrom: vietnamStartOfDay(query.fromDate),
    });
  // Khoảng nửa mở `[from, to)` — cận trên là 00:00 ngày kế tiếp và so bằng `<`.
  if (query.toDate)
    qb.andWhere('t.created_at < :cTo', {
      cTo: vietnamEndOfDayExclusive(query.toDate),
    });
}

/**
 * Sắp xếp hàng đợi: priority (URGENT→LOW), dueAt (gần hạn trước), mặc định
 * createdAt DESC.
 *
 * Luôn chốt bằng `t.id` ở cuối. Các khoá sắp xếp trên đều KHÔNG duy nhất
 * (nhiều ticket cùng mốc tạo, cùng hạn xử lý), mà thứ tự của phần bằng nhau
 * trong Postgres là không xác định — không có tie-breaker thì phân trang có thể
 * lặp/bỏ sót một ticket giữa hai trang, và bản xuất Excel bị cắt ở trần 5.000
 * dòng sẽ ra tập khác nhau giữa hai lần bấm liên tiếp.
 */
export function applyAdminTicketSort(
  qb: SelectQueryBuilder<SupportTicketEntity>,
  sort: AdminQueryTicketDto['sort'],
): void {
  if (sort === 'priority') {
    qb.orderBy(
      `CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END`,
      'ASC',
    ).addOrderBy('t.createdAt', 'DESC');
  } else if (sort === 'dueAt') {
    qb.orderBy('t.resolutionDueAt', 'ASC', 'NULLS LAST');
  } else {
    qb.orderBy('t.createdAt', 'DESC');
  }
  qb.addOrderBy('t.id', 'DESC');
}
