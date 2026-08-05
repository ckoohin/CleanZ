import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { ExcelSheetSpec } from 'src/common/helpers/excel-report.helper';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { ExportTicketListDto } from '../dto/export-ticket.dto';
import { StatsQueryDto, resolveStatsRange } from '../dto/stats-query.dto';
import {
  applyAdminTicketFilters,
  applyAdminTicketSort,
} from './ticket-query.filters';
import { TicketStatsService } from './ticket-stats.service';
import {
  CATEGORY_LABEL_VI,
  PENDING_REASON_LABEL_VI,
  PRIORITY_LABEL_VI,
  RESOLUTION_LABEL_VI,
  SOURCE_LABEL_VI,
  STATUS_LABEL_VI,
  labelOf,
} from '../ticket-report.labels';
import {
  MONEY_DIRECTION_LABEL_VI,
  MoneyDirection,
  moneyDirectionOf,
} from 'src/common/enums/resolution-type.meta';

/**
 * Trần số dòng cho một lần xuất danh sách.
 *
 * File được dựng trọn trong RAM (ExcelJS ghi buffer) rồi mới trả về, nên không
 * thể để một bộ lọc rộng kéo cả bảng vào bộ nhớ. Vượt trần thì vẫn trả file —
 * chỉ cắt bớt và nói rõ trong phần mô tả sheet, vì trả lỗi 400 giữa lúc admin
 * đang cần số liệu thì vô ích hơn là đưa họ 5.000 dòng mới nhất.
 */
export const EXPORT_MAX_ROWS = 5000;

/**
 * Câu cảnh báo bắt buộc đi kèm MỌI cột tiền trong báo cáo ticket.
 *
 * `RESOLUTION_EXECUTOR` hiện là `NoopResolutionExecutor` — kết luận xử lý mới
 * chỉ được GHI NHẬN, `walletTransactionId` luôn rỗng, dòng tiền thuộc Phase 2.
 * Để kế toán đọc một cột tên "Tiền chi ra" mà tưởng đó là tiền đã thực chi thì
 * sai bản chất, không chỉ sai con số.
 */
const MONEY_DISCLAIMER =
  'Số tiền là giá trị GHI NHẬN trên phiếu xử lý, chưa phải số đã thực chi qua ví. Tiền cộng trên MỌI lần ghi nhận của ticket, tách theo chiều: chi cho khách (hoàn tiền, bồi thường) và thu từ Tasker (phạt). Voucher và làm lại là bù hiện vật nên không vào cột tiền.';

const VND_FMT = '#,##0" đ"';
const HOUR_FMT = '0.0';
const RATING_FMT = '0.0';

interface GroupRow {
  k: string;
  c: number;
  breached?: number;
  avg_res?: string | null;
}

/** Tiền của một ticket, đã tách theo chiều dòng tiền (xem `resolution-type.meta`). */
interface TicketMoney {
  types: string[];
  outflow: number;
  inflow: number;
}

/**
 * Dựng dữ liệu Excel cho module Support Ticket.
 *
 * Tách hẳn khỏi `TicketAdminService` (hành động trên ticket) và
 * `TicketStatsService` (số liệu cho màn hình): service này chỉ biết BÀY dữ liệu
 * ra bảng — nó gọi lại đúng những hàm mà màn hình đang dùng, nên file tải về
 * luôn khớp với cái admin vừa nhìn thấy thay vì là một đường tính song song.
 *
 * Chủ ý KHÔNG export nội dung hội thoại: `ticket_messages` được mã hoá qua
 * `MessageCryptoService` và chứa cả ghi chú nội bộ — giải mã hàng loạt để đổ ra
 * file rời khỏi hệ thống là rủi ro lộ dữ liệu cá nhân, không phải nhu cầu báo cáo.
 */
@Injectable()
export class TicketReportService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    private readonly dataSource: DataSource,
    private readonly statsService: TicketStatsService,
  ) {}

  // ─── Tiện ích định dạng ────────────────────────────────────────────────────

  /**
   * Mốc lấy từ cột `timestamp without time zone` (created_at, resolved_at…).
   *
   * KHÔNG được ép `timeZone` ở đây. Các cột này lưu sẵn GIỜ VN dưới dạng wall
   * clock không mang offset, và node-postgres dựng `Date` bằng constructor giờ
   * ĐỊA PHƯƠNG của tiến trình — nên format theo giờ địa phương sẽ in lại đúng
   * con số đã lưu, bất kể `TZ` của máy chạy. Ép cứng 'Asia/Ho_Chi_Minh' thì chỉ
   * đúng khi TZ tiến trình cũng là VN; deploy ở môi trường mặc định UTC là mọi
   * mốc trong file lệch 7 giờ. Đây cũng là quy ước của `admin-dashboard-report`
   * và `service-package-reports`.
   */
  private static dtColumn(value: Date | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN');
  }

  /**
   * Mốc là INSTANT thật (kết quả `vietnamStartOfDay`/`vietnamEndOfDay`) — ngược
   * lại với `dtColumn`: ở đây PHẢI ép giờ VN, vì instant không mang sẵn thông
   * tin ngày theo múi giờ nào.
   */
  private static dInstant(value: Date): string {
    return value.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  }

  /**
   * Ngày do người dùng chọn, dạng 'YYYY-MM-DD'. Đổi thẳng chuỗi sang chuỗi,
   * không đi qua `Date` — cho `new Date()` chạm vào là lại mở cửa cho lệch múi
   * giờ ở đúng chỗ không cần thiết.
   */
  private static dateStr(value: string): string {
    const [y, m, d] = value.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  /**
   * Số giờ giữa hai mốc, đã TRỪ thời gian SLA bị tạm dừng (`slaPausedAccumMs`).
   * Cột này để đánh giá đội xử lý nhanh hay chậm, mà quãng "chờ khách phản hồi"
   * thì không phải lỗi của đội — tính cả vào là oan.
   *
   * `slaPausedAccumMs` là cột `bigint` nên TypeORM trả về CHUỖI: thiếu
   * `Number()` sẽ thành phép nối chuỗi và ra con số vô nghĩa.
   */
  private static hoursBetween(
    from: Date | null | undefined,
    to: Date | null | undefined,
    pausedMs: string | number = 0,
  ): number | string {
    if (!from || !to) return '—';
    const raw = new Date(to).getTime() - new Date(from).getTime();
    const net = raw - Number(pausedMs ?? 0);
    return Math.round(Math.max(0, net) / 3600) / 1000;
  }

  private static pctOf(part: number, total: number): number {
    return total > 0 ? part / total : 0;
  }

  // ─── Xuất DANH SÁCH ticket ────────────────────────────────────────────────

  /**
   * Mô tả bộ lọc đang áp, ghi thẳng vào đầu sheet. Id thô (admin/khách/booking)
   * được đổi sang tên người — không ai đối chiếu báo cáo bằng UUID.
   */
  private async buildListFilterSummary(
    query: ExportTicketListDto,
  ): Promise<string> {
    const parts: string[] = [];

    parts.push(
      query.fromDate || query.toDate
        ? `Ngày tạo: ${query.fromDate ? TicketReportService.dateStr(query.fromDate) : '…'} → ${
            query.toDate ? TicketReportService.dateStr(query.toDate) : '…'
          }`
        : 'Ngày tạo: Toàn bộ thời gian',
    );

    parts.push(
      `Trạng thái: ${query.status ? labelOf(STATUS_LABEL_VI, query.status) : 'Tất cả'}`,
    );
    parts.push(
      `Loại: ${query.category ? labelOf(CATEGORY_LABEL_VI, query.category) : 'Tất cả'}`,
    );
    parts.push(
      `Ưu tiên: ${query.priority ? labelOf(PRIORITY_LABEL_VI, query.priority) : 'Tất cả'}`,
    );

    if (query.slaBreached !== undefined) {
      parts.push(`SLA: ${query.slaBreached ? 'Vi phạm' : 'Trong hạn'}`);
    }

    if (query.assignedAdminId) {
      parts.push(`Phụ trách: ${await this.userName(query.assignedAdminId)}`);
    }
    if (query.reporterUserId) {
      parts.push(`Người báo cáo: ${await this.userName(query.reporterUserId)}`);
    }
    if (query.bookingId) {
      const rows: { code: string }[] = await this.dataSource.query(
        'SELECT booking_code AS code FROM bookings WHERE id = $1',
        [query.bookingId],
      );
      parts.push(`Booking: ${rows[0]?.code ?? query.bookingId}`);
    }
    if (query.keyword) parts.push(`Từ khoá: "${query.keyword}"`);

    return parts.join('  ·  ');
  }

  private async userName(id: string): Promise<string> {
    const rows: { name: string }[] = await this.dataSource.query(
      'SELECT full_name AS name FROM users WHERE id = $1',
      [id],
    );
    return rows[0]?.name ?? id;
  }

  async buildTicketListSheet(
    query: ExportTicketListDto,
  ): Promise<ExcelSheetSpec> {
    return asyncHandleOperation(async () => {
      const qb = this.ticketRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.booking', 'b')
        .leftJoinAndSelect('t.assignedAdmin', 'aa')
        .leftJoinAndSelect('t.reporter', 'rp')
        .leftJoinAndSelect('t.counterparty', 'cp');

      applyAdminTicketFilters(qb, query);
      applyAdminTicketSort(qb, query.sort);

      // Đếm trước để biết có bị cắt trần hay không, rồi mới lấy dữ liệu.
      // Dùng limit/offset chứ không phải take/skip: các quan hệ đều ManyToOne
      // nên join không nhân dòng, không cần TypeORM chạy query phụ lấy id.
      const total = await qb.getCount();
      const tickets = await qb.limit(EXPORT_MAX_ROWS).getMany();
      const truncated = total > EXPORT_MAX_ROWS;

      const ids = tickets.map((t) => t.id);
      const [resolutionByTicket, ratingByTicket] = await Promise.all([
        this.resolutionMap(ids),
        this.ratingMap(ids),
      ]);

      const rows = tickets.map((t) => {
        const res = resolutionByTicket.get(t.id);
        return {
          ticketCode: t.ticketCode ?? '—',
          subject: t.subject,
          category: labelOf(CATEGORY_LABEL_VI, t.category),
          subtype: t.subtype ?? '—',
          priority: labelOf(PRIORITY_LABEL_VI, t.priority),
          status: labelOf(STATUS_LABEL_VI, t.status),
          source: labelOf(SOURCE_LABEL_VI, t.source),
          reporter: t.reporter?.fullName ?? '—',
          counterparty: t.counterparty?.fullName ?? '—',
          assignedAdmin: t.assignedAdmin?.fullName ?? 'Chưa gán',
          bookingCode: t.booking?.bookingCode ?? '—',
          createdAt: TicketReportService.dtColumn(t.createdAt),
          firstRespondedAt: TicketReportService.dtColumn(t.firstRespondedAt),
          resolvedAt: TicketReportService.dtColumn(t.resolvedAt),
          closedAt: TicketReportService.dtColumn(t.closedAt),
          firstResponseHours: TicketReportService.hoursBetween(
            t.createdAt,
            t.firstRespondedAt,
          ),
          resolutionHours: TicketReportService.hoursBetween(
            t.createdAt,
            t.resolvedAt,
            t.slaPausedAccumMs,
          ),
          firstResponseBreached: t.firstResponseBreached ? 'Có' : 'Không',
          slaBreached: t.slaBreached ? 'Có' : 'Không',
          pendingReason: labelOf(PENDING_REASON_LABEL_VI, t.pendingReason),
          resolutionType: res
            ? res.types.map((t) => labelOf(RESOLUTION_LABEL_VI, t)).join(' · ')
            : 'Chưa có',
          outflow: res?.outflow ?? 0,
          inflow: res?.inflow ?? 0,
          rating: ratingByTicket.get(t.id) ?? '',
        };
      });

      const moneyNote = MONEY_DISCLAIMER;
      const subtitle = truncated
        ? `Chi tiết từng ticket khớp bộ lọc. CHỈ hiển thị ${EXPORT_MAX_ROWS.toLocaleString('vi-VN')} ticket đầu theo thứ tự đang sắp xếp, trên tổng ${total.toLocaleString('vi-VN')} — hãy thu hẹp kỳ lọc để lấy đủ. ${moneyNote}`
        : `Chi tiết từng ticket khớp bộ lọc — tổng ${total.toLocaleString('vi-VN')} ticket. Nội dung hội thoại không được xuất vì chứa dữ liệu cá nhân đã mã hoá. ${moneyNote}`;

      return {
        name: 'Danh sách ticket',
        title: 'DANH SÁCH PHIẾU HỖ TRỢ',
        subtitle,
        filterSummary: await this.buildListFilterSummary(query),
        columns: [
          { header: 'Mã ticket', key: 'ticketCode', width: 14 },
          { header: 'Tiêu đề', key: 'subject', width: 40 },
          { header: 'Loại', key: 'category', width: 20 },
          { header: 'Loại phụ', key: 'subtype', width: 18 },
          { header: 'Ưu tiên', key: 'priority', width: 13 },
          { header: 'Trạng thái', key: 'status', width: 14 },
          { header: 'Nguồn', key: 'source', width: 20 },
          { header: 'Người báo cáo', key: 'reporter', width: 22 },
          { header: 'Bên liên quan', key: 'counterparty', width: 22 },
          { header: 'Admin phụ trách', key: 'assignedAdmin', width: 22 },
          { header: 'Mã booking', key: 'bookingCode', width: 16 },
          { header: 'Ngày tạo', key: 'createdAt', width: 20 },
          { header: 'Phản hồi đầu lúc', key: 'firstRespondedAt', width: 20 },
          { header: 'Giải quyết lúc', key: 'resolvedAt', width: 20 },
          { header: 'Đóng lúc', key: 'closedAt', width: 20 },
          {
            header: 'TG phản hồi đầu (giờ)',
            key: 'firstResponseHours',
            width: 19,
            numFmt: HOUR_FMT,
            alignRight: true,
          },
          {
            header: 'TG xử lý (giờ)',
            key: 'resolutionHours',
            width: 16,
            numFmt: HOUR_FMT,
            alignRight: true,
          },
          {
            header: 'Trễ hạn phản hồi',
            key: 'firstResponseBreached',
            width: 16,
          },
          { header: 'Trễ hạn xử lý', key: 'slaBreached', width: 14 },
          { header: 'Lý do chờ', key: 'pendingReason', width: 16 },
          { header: 'Hình thức xử lý', key: 'resolutionType', width: 22 },
          {
            header: 'Tiền chi ra',
            key: 'outflow',
            width: 16,
            numFmt: VND_FMT,
            sumable: true,
            alignRight: true,
          },
          {
            header: 'Tiền thu về',
            key: 'inflow',
            width: 16,
            numFmt: VND_FMT,
            sumable: true,
            alignRight: true,
          },
          {
            header: 'Điểm hài lòng',
            key: 'rating',
            width: 14,
            numFmt: RATING_FMT,
            alignRight: true,
          },
        ],
        rows,
      };
    }, 'Lỗi khi dựng danh sách ticket để xuất Excel');
  }

  /**
   * TOÀN BỘ kết luận xử lý của từng ticket, gộp lại: danh sách hình thức theo
   * thứ tự thời gian và TỔNG tiền của mọi lần ghi nhận.
   *
   * Trước đây chỉ lấy bản mới nhất nhưng cột tiền vẫn đánh `sumable` — ticket
   * xử lý nhiều bước (giải thích rồi mới hoàn tiền) bị bỏ mất các bước trước,
   * nên dòng TỔNG CỘNG ở sheet Danh sách lệch với sheet "Kết luận & bồi hoàn"
   * (sheet đó cộng mọi resolution). Hai con số cùng tên lệch nhau trong cùng một
   * file là thứ phá niềm tin nhanh nhất, nên nay cả hai cùng cộng trên MỌI lần
   * ghi nhận.
   *
   * Truy vấn raw chỉ lấy `ticket_id`: `find({ relations: ['ticket'] })` sẽ JOIN
   * và select lại toàn bộ cột của ticket cho từng dòng resolution — với 5.000
   * ticket là dựng thừa hàng nghìn entity chỉ để đọc một cái id.
   */
  private async resolutionMap(
    ids: string[],
  ): Promise<Map<string, TicketMoney>> {
    const map = new Map<string, TicketMoney>();
    if (ids.length === 0) return map;

    const rows = await this.dataSource.query<
      { ticket_id: string; type: string; amount: string | null }[]
    >(
      `SELECT ticket_id, type, amount
       FROM ticket_resolutions
       WHERE ticket_id = ANY($1)
       ORDER BY created_at ASC, id ASC`,
      [ids],
    );

    for (const r of rows) {
      const entry = map.get(r.ticket_id) ?? {
        types: [],
        outflow: 0,
        inflow: 0,
      };
      if (!entry.types.includes(r.type)) entry.types.push(r.type);

      // Dấu nằm ở `type`, không nằm ở `amount` (amount luôn ≥ 0). Cộng thẳng
      // vào một tổng chung là gộp lẫn tiền trả khách với tiền phạt Tasker.
      const amount = Number(r.amount ?? 0);
      const direction = moneyDirectionOf(r.type);
      if (direction === MoneyDirection.OUTFLOW) entry.outflow += amount;
      else if (direction === MoneyDirection.INFLOW) entry.inflow += amount;

      map.set(r.ticket_id, entry);
    }
    return map;
  }

  /**
   * Điểm hài lòng của từng ticket. `ORDER BY submitted_at` để ticket có nhiều
   * phiếu luôn lấy phiếu MỚI NHẤT một cách xác định — không có ORDER BY thì
   * điểm hiện ra phụ thuộc thứ tự Postgres trả về, mỗi lần xuất một khác.
   */
  private async ratingMap(ids: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (ids.length === 0) return map;

    const rows = await this.dataSource.query<
      { ticket_id: string; rating: number }[]
    >(
      `SELECT ticket_id, rating
       FROM ticket_surveys
       WHERE ticket_id = ANY($1) AND rating IS NOT NULL
       ORDER BY submitted_at ASC NULLS FIRST, created_at ASC`,
      [ids],
    );

    for (const s of rows) map.set(s.ticket_id, Number(s.rating));
    return map;
  }

  // ─── Xuất BÁO CÁO tổng hợp ────────────────────────────────────────────────

  getReportFilterSummary(query: StatsQueryDto): string {
    const [from, to] = resolveStatsRange(query);
    // `to` là cận trên KHÔNG bao gồm (00:00 ngày kế tiếp) — in thẳng ra sẽ
    // thành "báo cáo tháng 7 … đến 01/08". Có chuỗi ngày người dùng chọn thì
    // dùng luôn; không có thì lùi 1ms để về lại ngày cuối kỳ thật.
    const fromLabel = query.fromDate
      ? TicketReportService.dateStr(query.fromDate)
      : TicketReportService.dInstant(from);
    const toLabel = query.toDate
      ? TicketReportService.dateStr(query.toDate)
      : TicketReportService.dInstant(new Date(to.getTime() - 1));
    return `Ticket được tạo từ ${fromLabel} đến ${toLabel}`;
  }

  /**
   * 6 sheet báo cáo vận hành. Dùng chung cho cả hai chế độ bày file (mỗi mục
   * một tab / gộp một trang tính) — dữ liệu y hệt, chỉ khác cách xếp.
   */
  async buildReportSheets(query: StatsQueryDto): Promise<ExcelSheetSpec[]> {
    return asyncHandleOperation(async () => {
      const [from, to] = resolveStatsRange(query);
      const filterSummary = this.getReportFilterSummary(query);
      const stats = await this.statsService.getStats(from, to);

      const [byCategory, byPriority, byAdmin, byResolution] = await Promise.all(
        [
          this.categoryBreakdown(from, to),
          this.priorityBreakdown(from, to),
          this.adminPerformance(from, to),
          this.resolutionBreakdown(from, to),
        ],
      );

      return [
        this.overviewSheet(stats, byResolution, filterSummary),
        this.statusSheet(stats, filterSummary),
        this.categorySheet(byCategory, stats.total, filterSummary),
        this.prioritySheet(byPriority, stats.total, filterSummary),
        this.adminSheet(byAdmin, filterSummary),
        this.resolutionSheet(byResolution, filterSummary),
        this.csatSheet(stats, filterSummary),
      ];
    }, 'Lỗi khi dựng báo cáo ticket để xuất Excel');
  }

  /** Tổng tiền theo chiều, gộp từ bảng phân rã kết luận xử lý. */
  private static sumByDirection(data: { k: string; total_amount: string }[]): {
    outflow: number;
    inflow: number;
  } {
    let outflow = 0;
    let inflow = 0;
    for (const r of data) {
      const amount = Number(r.total_amount ?? 0);
      const direction = moneyDirectionOf(r.k);
      if (direction === MoneyDirection.OUTFLOW) outflow += amount;
      else if (direction === MoneyDirection.INFLOW) inflow += amount;
    }
    return { outflow, inflow };
  }

  private overviewSheet(
    s: Awaited<ReturnType<TicketStatsService['getStats']>>,
    byResolution: { k: string; c: number; total_amount: string }[],
    filterSummary: string,
  ): ExcelSheetSpec {
    const money = TicketReportService.sumByDirection(byResolution);
    return {
      name: 'Tổng quan',
      title: 'BÁO CÁO TỔNG QUAN HỖ TRỢ KHÁCH HÀNG',
      subtitle:
        'Các chỉ số cốt lõi về khối lượng, tuân thủ SLA, tốc độ xử lý và mức hài lòng trong kỳ.',
      filterSummary,
      columns: [
        { header: 'Chỉ số', key: 'label', width: 34 },
        {
          header: 'Giá trị',
          key: 'value',
          width: 16,
          numFmt: '#,##0.0',
          alignRight: true,
        },
        { header: 'Đơn vị', key: 'unit', width: 12 },
        { header: 'Ghi chú', key: 'note', width: 52 },
      ],
      rows: [
        {
          label: 'Tổng ticket',
          value: s.total,
          unit: 'ticket',
          note: 'Ticket được TẠO trong kỳ, mọi trạng thái',
        },
        {
          label: 'Đã giải quyết',
          value: s.handling.resolvedCount,
          unit: 'ticket',
          note: 'Có mốc giải quyết, không phụ thuộc đã đóng hay chưa',
        },
        {
          label: 'Tuân thủ hạn phản hồi lần đầu',
          value: s.sla.firstResponseComplianceRate,
          unit: '%',
          note: `${s.sla.firstResponseBreached} ticket trễ hạn phản hồi`,
        },
        {
          label: 'Tuân thủ hạn xử lý',
          value: s.sla.resolutionComplianceRate,
          unit: '%',
          note: `${s.sla.resolutionBreached} ticket trễ hạn xử lý`,
        },
        {
          label: 'Thời gian phản hồi đầu trung bình',
          value: s.handling.avgFirstResponseMins ?? 0,
          unit: 'phút',
          note: 'Tính từ lúc tạo ticket tới tin trả lời đầu tiên',
        },
        {
          label: 'Thời gian xử lý trung bình',
          value: s.handling.avgResolutionMins ?? 0,
          unit: 'phút',
          note: 'Tính từ lúc tạo ticket tới lúc chuyển sang đã giải quyết',
        },
        {
          label: 'Phiếu khảo sát đã mời',
          value: s.csat.invited,
          unit: 'phiếu',
          note: 'Số ticket đã gửi lời mời đánh giá',
        },
        {
          label: 'Phiếu khảo sát đã chấm',
          value: s.csat.responses,
          unit: 'phiếu',
          note: `Tỉ lệ phản hồi ${Math.round(TicketReportService.pctOf(s.csat.responses, s.csat.invited) * 1000) / 10}%`,
        },
        {
          label: 'Điểm hài lòng trung bình',
          value: s.csat.avgRating ?? 0,
          unit: '/5',
          note: 'Trung bình điểm sao khách chấm trong kỳ',
        },
        // Ba dòng dòng tiền đặt ở đây vì sheet "Kết luận & bồi hoàn" chỉ có một
        // dòng TỔNG CỘNG (giới hạn của excel-report.helper), không chỗ nào đặt
        // được con số CHI RÒNG — mà đó lại là con số người quản lý hỏi đầu tiên.
        {
          label: 'Tổng chi bồi hoàn',
          value: money.outflow,
          unit: 'đ',
          note: 'Hoàn tiền + bồi thường — ghi nhận trên phiếu, chưa thực chi qua ví',
        },
        {
          label: 'Tổng thu từ phạt Tasker',
          value: money.inflow,
          unit: 'đ',
          note: 'Khoản khấu trừ Tasker đã ghi nhận trong kỳ',
        },
        {
          label: 'Chi ròng',
          value: money.outflow - money.inflow,
          unit: 'đ',
          note: 'Tổng chi bồi hoàn trừ tổng thu từ phạt Tasker',
        },
      ],
    };
  }

  private statusSheet(
    s: Awaited<ReturnType<TicketStatsService['getStats']>>,
    filterSummary: string,
  ): ExcelSheetSpec {
    const rows = Object.entries(s.byStatus).map(([k, c]) => ({
      label: labelOf(STATUS_LABEL_VI, k),
      count: c,
      pct: TicketReportService.pctOf(c, s.total),
    }));
    return {
      name: 'Theo trạng thái',
      title: 'PHÂN BỐ TICKET THEO TRẠNG THÁI',
      subtitle: 'Ticket đang nằm ở đâu trong quy trình xử lý.',
      filterSummary,
      columns: [
        { header: 'Trạng thái', key: 'label', width: 20 },
        {
          header: 'Số ticket',
          key: 'count',
          width: 14,
          sumable: true,
          alignRight: true,
        },
        {
          header: '% trên tổng',
          key: 'pct',
          width: 14,
          numFmt: '0.0%',
          alignRight: true,
        },
      ],
      rows,
    };
  }

  private categorySheet(
    data: GroupRow[],
    total: number,
    filterSummary: string,
  ): ExcelSheetSpec {
    return {
      name: 'Theo loại vấn đề',
      title: 'PHÂN BỐ TICKET THEO LOẠI VẤN ĐỀ',
      subtitle:
        'Loại vấn đề nào chiếm nhiều ticket nhất, trễ hạn nhiều nhất và tốn thời gian xử lý nhất — dùng để quyết định nên cải thiện khâu nào trước.',
      filterSummary,
      columns: [
        { header: 'Loại vấn đề', key: 'label', width: 26 },
        {
          header: 'Số ticket',
          key: 'count',
          width: 12,
          sumable: true,
          alignRight: true,
        },
        {
          header: '% trên tổng',
          key: 'pct',
          width: 13,
          numFmt: '0.0%',
          alignRight: true,
        },
        {
          header: 'Trễ hạn xử lý',
          key: 'breached',
          width: 14,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Tỉ lệ trễ hạn',
          key: 'breachRate',
          width: 14,
          numFmt: '0.0%',
          alignRight: true,
        },
        {
          header: 'TG xử lý TB (giờ)',
          key: 'avgHours',
          width: 17,
          numFmt: HOUR_FMT,
          alignRight: true,
        },
      ],
      rows: data.map((r) => ({
        label: labelOf(CATEGORY_LABEL_VI, r.k),
        count: r.c,
        pct: TicketReportService.pctOf(r.c, total),
        breached: r.breached ?? 0,
        breachRate: TicketReportService.pctOf(r.breached ?? 0, r.c),
        avgHours: r.avg_res === null ? '—' : Number(r.avg_res) / 60,
      })),
    };
  }

  private prioritySheet(
    data: GroupRow[],
    total: number,
    filterSummary: string,
  ): ExcelSheetSpec {
    return {
      name: 'Theo mức ưu tiên',
      title: 'PHÂN BỐ TICKET THEO MỨC ƯU TIÊN',
      subtitle:
        'Ticket ưu tiên càng cao mà tỉ lệ trễ hạn càng lớn thì SLA đang đặt sai hoặc nhân sự đang thiếu ở đúng nhóm quan trọng nhất.',
      filterSummary,
      columns: [
        { header: 'Mức ưu tiên', key: 'label', width: 18 },
        {
          header: 'Số ticket',
          key: 'count',
          width: 12,
          sumable: true,
          alignRight: true,
        },
        {
          header: '% trên tổng',
          key: 'pct',
          width: 13,
          numFmt: '0.0%',
          alignRight: true,
        },
        {
          header: 'Trễ hạn xử lý',
          key: 'breached',
          width: 14,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Tỉ lệ tuân thủ',
          key: 'compliance',
          width: 15,
          numFmt: '0.0%',
          alignRight: true,
        },
        {
          header: 'TG xử lý TB (giờ)',
          key: 'avgHours',
          width: 17,
          numFmt: HOUR_FMT,
          alignRight: true,
        },
      ],
      rows: data.map((r) => ({
        label: labelOf(PRIORITY_LABEL_VI, r.k),
        count: r.c,
        pct: TicketReportService.pctOf(r.c, total),
        breached: r.breached ?? 0,
        compliance: TicketReportService.pctOf(r.c - (r.breached ?? 0), r.c),
        avgHours: r.avg_res === null ? '—' : Number(r.avg_res) / 60,
      })),
    };
  }

  private adminSheet(
    data: {
      name: string;
      total: number;
      resolved: number;
      breached: number;
      avg_res: string | null;
      avg_csat: string | null;
    }[],
    filterSummary: string,
  ): ExcelSheetSpec {
    return {
      name: 'Hiệu suất theo admin',
      title: 'HIỆU SUẤT XỬ LÝ THEO ADMIN PHỤ TRÁCH',
      subtitle:
        'Ticket tính theo người ĐANG được gán tại thời điểm xuất báo cáo. Dòng "Chưa gán" là ticket còn nằm ở hàng đợi chung.',
      filterSummary,
      columns: [
        { header: 'Admin phụ trách', key: 'name', width: 26 },
        {
          header: 'Được gán',
          key: 'total',
          width: 12,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Đã giải quyết',
          key: 'resolved',
          width: 14,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Tỉ lệ giải quyết',
          key: 'resolveRate',
          width: 16,
          numFmt: '0.0%',
          alignRight: true,
        },
        {
          header: 'Trễ hạn xử lý',
          key: 'breached',
          width: 14,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'TG xử lý TB (giờ)',
          key: 'avgHours',
          width: 17,
          numFmt: HOUR_FMT,
          alignRight: true,
        },
        {
          header: 'Điểm hài lòng TB',
          key: 'avgCsat',
          width: 17,
          numFmt: RATING_FMT,
          alignRight: true,
        },
      ],
      rows: data.map((r) => ({
        name: r.name,
        total: r.total,
        resolved: r.resolved,
        resolveRate: TicketReportService.pctOf(r.resolved, r.total),
        breached: r.breached,
        avgHours: r.avg_res === null ? '—' : Number(r.avg_res) / 60,
        avgCsat: r.avg_csat === null ? '—' : Number(r.avg_csat),
      })),
    };
  }

  private resolutionSheet(
    data: { k: string; c: number; total_amount: string }[],
    filterSummary: string,
  ): ExcelSheetSpec {
    return {
      name: 'Kết luận & bồi hoàn',
      title: 'KẾT LUẬN XỬ LÝ VÀ CHI PHÍ BỒI HOÀN',
      subtitle: `Tổng hợp theo hình thức xử lý đã ghi nhận. ${MONEY_DISCLAIMER} Hai cột tiền có dòng tổng RIÊNG — không có ô nào cộng lẫn hai chiều.`,
      filterSummary,
      columns: [
        { header: 'Hình thức xử lý', key: 'label', width: 22 },
        { header: 'Nhóm dòng tiền', key: 'direction', width: 20 },
        {
          header: 'Số vụ',
          key: 'count',
          width: 12,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Tiền chi ra',
          key: 'outflow',
          width: 20,
          numFmt: VND_FMT,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Tiền thu về',
          key: 'inflow',
          width: 20,
          numFmt: VND_FMT,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Trung bình / vụ',
          key: 'avgAmount',
          width: 20,
          numFmt: VND_FMT,
          alignRight: true,
        },
      ],
      rows: data.map((r) => {
        const amount = Number(r.total_amount ?? 0);
        const direction = moneyDirectionOf(r.k);
        const isMoney =
          direction === MoneyDirection.OUTFLOW ||
          direction === MoneyDirection.INFLOW;
        return {
          label: labelOf(RESOLUTION_LABEL_VI, r.k),
          direction: MONEY_DIRECTION_LABEL_VI[direction],
          count: r.c,
          // Hàng không phải tiền mặt để TRỐNG chứ không điền 0: 0 đọc như
          // "đã tính và bằng không", trống đọc đúng là "không thuộc phạm vi
          // cột này". Ô trống cũng không lọt vào công thức SUM.
          outflow: direction === MoneyDirection.OUTFLOW ? amount : '',
          inflow: direction === MoneyDirection.INFLOW ? amount : '',
          avgAmount: isMoney && r.c > 0 ? Math.round(amount / r.c) : '',
        };
      }),
    };
  }

  private csatSheet(
    s: Awaited<ReturnType<TicketStatsService['getStats']>>,
    filterSummary: string,
  ): ExcelSheetSpec {
    return {
      name: 'Mức độ hài lòng',
      title: 'PHÂN BỐ ĐIỂM HÀI LÒNG (CSAT)',
      subtitle: `Trên ${s.csat.responses} phiếu đã chấm điểm / ${s.csat.invited} phiếu đã mời đánh giá.`,
      filterSummary,
      columns: [
        { header: 'Mức điểm', key: 'label', width: 14 },
        {
          header: 'Số phiếu',
          key: 'count',
          width: 12,
          sumable: true,
          alignRight: true,
        },
        {
          header: '% trên số phiếu đã chấm',
          key: 'pct',
          width: 24,
          numFmt: '0.0%',
          alignRight: true,
        },
      ],
      rows: [5, 4, 3, 2, 1].map((star) => {
        const count = s.csat.distribution[String(star)] ?? 0;
        return {
          label: `${star} sao`,
          count,
          pct: TicketReportService.pctOf(count, s.csat.responses),
        };
      }),
    };
  }

  // ─── Truy vấn tổng hợp ────────────────────────────────────────────────────
  // Aggregate bằng SQL thuần (không nạp entity) và luôn bound theo kỳ, giống
  // cách TicketStatsService đang làm.

  private groupWithSla(
    column: 'category' | 'priority',
    from: Date,
    to: Date,
  ): Promise<GroupRow[]> {
    return this.dataSource.query(
      `SELECT ${column} AS k,
              COUNT(*)::int AS c,
              COUNT(*) FILTER (WHERE sla_breached)::int AS breached,
              AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)
                FILTER (WHERE resolved_at IS NOT NULL) AS avg_res
       FROM support_tickets
       WHERE created_at >= $1 AND created_at < $2
       GROUP BY ${column}
       ORDER BY c DESC`,
      [from, to],
    );
  }

  private categoryBreakdown(from: Date, to: Date): Promise<GroupRow[]> {
    return this.groupWithSla('category', from, to);
  }

  private priorityBreakdown(from: Date, to: Date): Promise<GroupRow[]> {
    return this.groupWithSla('priority', from, to);
  }

  private adminPerformance(from: Date, to: Date) {
    // CSAT gộp sẵn trong subquery: join thẳng ticket_surveys sẽ nhân dòng khi
    // một ticket có nhiều phiếu, làm COUNT(*) ở trên đếm sai.
    //
    // GROUP BY theo assigned_admin_id chứ KHÔNG theo full_name: hai admin trùng
    // tên sẽ bị gộp thành một dòng với số liệu cộng dồn, mà đây lại đúng là
    // sheet dùng để đánh giá con người — sai kiểu đó không ai nhìn ra được.
    // Nhóm id NULL vẫn gom đúng thành một dòng "Chưa gán".
    return this.dataSource.query<
      {
        name: string;
        total: number;
        resolved: number;
        breached: number;
        avg_res: string | null;
        avg_csat: string | null;
      }[]
    >(
      `SELECT COALESCE(u.full_name, 'Chưa gán') AS name,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE t.resolved_at IS NOT NULL)::int AS resolved,
              COUNT(*) FILTER (WHERE t.sla_breached)::int AS breached,
              AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60)
                FILTER (WHERE t.resolved_at IS NOT NULL) AS avg_res,
              AVG(s.rating) AS avg_csat
       FROM support_tickets t
       LEFT JOIN users u ON u.id = t.assigned_admin_id
       LEFT JOIN (
         SELECT ticket_id, AVG(rating) AS rating
         FROM ticket_surveys
         WHERE rating IS NOT NULL
         GROUP BY ticket_id
       ) s ON s.ticket_id = t.id
       WHERE t.created_at >= $1 AND t.created_at < $2
       GROUP BY t.assigned_admin_id, u.full_name
       ORDER BY total DESC, name ASC`,
      [from, to],
    );
  }

  private resolutionBreakdown(from: Date, to: Date) {
    return this.dataSource.query<
      { k: string; c: number; total_amount: string }[]
    >(
      `SELECT r.type AS k,
              COUNT(*)::int AS c,
              COALESCE(SUM(r.amount), 0) AS total_amount
       FROM ticket_resolutions r
       JOIN support_tickets t ON t.id = r.ticket_id
       WHERE t.created_at >= $1 AND t.created_at < $2
       GROUP BY r.type
       ORDER BY c DESC`,
      [from, to],
    );
  }
}
