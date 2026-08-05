import { OmitType } from '@nestjs/swagger';
import { AdminQueryTicketDto } from './admin-query-ticket.dto';

/**
 * Bộ lọc khi xuất DANH SÁCH ticket: y hệt hàng đợi nhưng bỏ phân trang — file
 * phải chứa trọn tập khớp bộ lọc, không phải mỗi trang admin đang xem.
 *
 * Xuất BÁO CÁO không cần DTO riêng: nó chỉ nhận kỳ thống kê, tức đúng bằng
 * `StatsQueryDto` — dùng thẳng class đó ở controller.
 */
export class ExportTicketListDto extends OmitType(AdminQueryTicketDto, [
  'page',
  'limit',
] as const) {}
