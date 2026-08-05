import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { ExcelSheetSpec } from 'src/common/helpers/excel-report.helper';
import { formatReportRangeLabel } from 'src/common/helpers/report-range.helper';
import { IncidentEntity } from '../entity/incident.entity';
import { ExportIncidentListDto } from '../dto/export-incident.dto';
import {
  ExportIncidentReportDto,
  resolveIncidentReportRange,
} from '../dto/export-incident.dto';
import {
  applyAdminIncidentFilters,
  applyAdminIncidentSort,
} from './incident-query.filters';
import {
  INC_CLOSURE_LABEL_VI,
  INC_OUTCOME_LABEL_VI,
  INC_RESPONSIBILITY_LABEL_VI,
  INC_SEVERITY_LABEL_VI,
  INC_SOURCE_LABEL_VI,
  INC_STATUS_LABEL_VI,
  INC_TYPE_LABEL_VI,
  incLabel,
} from '../incident-report.labels';

/**
 * Trần số dòng cho một lần xuất danh sách. Xem `EXPORT_MAX_ROWS` của module
 * phiếu hỗ trợ: file dựng trọn trong RAM nên không thể để một bộ lọc rộng kéo
 * cả bảng vào bộ nhớ. Vượt trần thì vẫn trả file, chỉ cắt bớt và nói rõ.
 */
export const INCIDENT_EXPORT_MAX_ROWS = 5000;

const VND_FMT = '#,##0" đ"';
const HOUR_FMT = '0.0';

/**
 * Câu cảnh báo bắt buộc đi kèm mọi cột tiền trong báo cáo sự cố.
 *
 * Điểm dễ đọc sai nhất: `Tiền duyệt chi = Tasker chịu + Nền tảng chịu`. Ba cột
 * đó nằm cạnh nhau và đều có dòng tổng, ai cộng cả ba lại là đếm đôi toàn bộ
 * khoản bồi thường.
 */
const INCIDENT_MONEY_NOTE =
  'Lưu ý: "Tiền duyệt chi" ĐÃ BAO GỒM "Tasker chịu" + "Nền tảng chịu" — đây là một khoản chia hai nguồn, không phải ba khoản riêng. "Chi ngoài ví" là phần chuyển khoản thủ công, nằm ngoài sổ ví.';

interface GroupRow {
  k: string | null;
  c: number;
  approved: string | null;
  tasker_borne: string | null;
  platform_borne: string | null;
}

/**
 * Dựng dữ liệu Excel cho module Incident.
 *
 * Tách khỏi `IncidentAdminService` (hành động trên sự cố): service này chỉ biết
 * BÀY dữ liệu ra bảng, và nó dùng CHUNG bộ lọc với hàng đợi nên file tải về
 * luôn khớp với cái admin vừa nhìn thấy.
 *
 * Chủ ý KHÔNG export bằng chứng, giải trình hay ghi chú nội bộ: đó là dữ liệu
 * cá nhân và tài liệu thẩm định, không phải nhu cầu báo cáo.
 */
@Injectable()
export class IncidentReportService {
  constructor(
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Tiện ích ─────────────────────────────────────────────────────────────

  /**
   * Mốc lấy từ cột `timestamp without time zone`. KHÔNG ép `timeZone`: các cột
   * này lưu sẵn giờ VN dạng wall clock và node-postgres dựng `Date` theo giờ
   * địa phương của tiến trình — ép cứng 'Asia/Ho_Chi_Minh' chỉ đúng khi TZ tiến
   * trình cũng là VN, deploy ở môi trường UTC là lệch 7 giờ.
   */
  private static dt(value: Date | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN');
  }

  /** Cột `numeric` của Postgres về TypeScript là CHUỖI — thiếu Number() là nối chuỗi. */
  private static money(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private static hours(
    from: Date | null | undefined,
    to: Date | null | undefined,
  ): number | string {
    if (!from || !to) return '—';
    const ms = new Date(to).getTime() - new Date(from).getTime();
    return Math.round(Math.max(0, ms) / 3600) / 1000;
  }

  private static pctOf(part: number, total: number): number {
    return total > 0 ? part / total : 0;
  }

  private async userName(id: string): Promise<string> {
    const rows: { name: string }[] = await this.dataSource.query(
      'SELECT full_name AS name FROM users WHERE id = $1',
      [id],
    );
    return rows[0]?.name ?? id;
  }

  // ─── Xuất DANH SÁCH sự cố ─────────────────────────────────────────────────

  private async buildListFilterSummary(
    query: ExportIncidentListDto,
  ): Promise<string> {
    const parts: string[] = [];

    parts.push(
      query.fromDate || query.toDate
        ? `Ngày báo cáo: ${formatDateStr(query.fromDate)} → ${formatDateStr(query.toDate)}`
        : 'Ngày báo cáo: Toàn bộ thời gian',
    );
    parts.push(
      `Trạng thái: ${query.status ? incLabel(INC_STATUS_LABEL_VI, query.status) : 'Tất cả'}`,
    );
    parts.push(
      `Mức độ: ${query.severity ? incLabel(INC_SEVERITY_LABEL_VI, query.severity) : 'Tất cả'}`,
    );
    if (query.overdue === 'true') parts.push('Chỉ sự cố quá hạn quyết định');

    if (query.taskerId) {
      const rows: { name: string }[] = await this.dataSource.query(
        `SELECT u.full_name AS name FROM taskers t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
        [query.taskerId],
      );
      parts.push(`Tasker: ${rows[0]?.name ?? query.taskerId}`);
    }
    if (query.customerId) {
      const rows: { name: string }[] = await this.dataSource.query(
        `SELECT u.full_name AS name FROM customers c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
        [query.customerId],
      );
      parts.push(`Khách hàng: ${rows[0]?.name ?? query.customerId}`);
    }

    return parts.join('  ·  ');
  }

  async buildIncidentListSheet(
    query: ExportIncidentListDto,
  ): Promise<ExcelSheetSpec> {
    return asyncHandleOperation(async () => {
      const qb = this.incidentRepo
        .createQueryBuilder('i')
        .leftJoinAndSelect('i.booking', 'b')
        .leftJoinAndSelect('i.customer', 'c')
        .leftJoinAndSelect('c.user', 'cu')
        .leftJoinAndSelect('i.tasker', 't')
        .leftJoinAndSelect('t.user', 'tu')
        .leftJoinAndSelect('i.finalizedByAdmin', 'fa');

      applyAdminIncidentFilters(qb, query);
      applyAdminIncidentSort(qb, query.sort);

      const total = await qb.getCount();
      const rowsRaw = await qb.limit(INCIDENT_EXPORT_MAX_ROWS).getMany();
      const truncated = total > INCIDENT_EXPORT_MAX_ROWS;
      const now = Date.now();

      const rows = rowsRaw.map((i) => ({
        incidentCode: i.incidentCode ?? '—',
        title: i.title,
        type: incLabel(INC_TYPE_LABEL_VI, i.type),
        source: incLabel(INC_SOURCE_LABEL_VI, i.source),
        severity: incLabel(INC_SEVERITY_LABEL_VI, i.severity),
        status: incLabel(INC_STATUS_LABEL_VI, i.status),
        outcome: incLabel(INC_OUTCOME_LABEL_VI, i.decisionOutcome, 'Chưa có'),
        closureReason: incLabel(INC_CLOSURE_LABEL_VI, i.closureReason),
        responsibility: incLabel(
          INC_RESPONSIBILITY_LABEL_VI,
          i.responsibilityParty,
        ),
        customer: i.customer?.user?.fullName ?? '—',
        tasker: i.tasker?.user?.fullName ?? '—',
        bookingCode: i.booking?.bookingCode ?? '—',
        reportedAt: IncidentReportService.dt(i.reportedAt),
        decisionDueAt: IncidentReportService.dt(i.decisionDueAt),
        finalizedAt: IncidentReportService.dt(i.finalizedAt),
        resolvedAt: IncidentReportService.dt(i.resolvedAt),
        // Cùng định nghĩa "quá hạn" với bộ lọc hàng đợi: còn hạn quyết định,
        // đã qua hạn, và chưa đóng. So bằng enum chứ không phải chuỗi thô —
        // đổi tên trạng thái sau này là TypeScript bắt được ngay.
        overdue:
          i.decisionDueAt &&
          new Date(i.decisionDueAt).getTime() < now &&
          i.status !== IncidentStatus.CLOSED
            ? 'Có'
            : 'Không',
        handlingHours: IncidentReportService.hours(i.reportedAt, i.finalizedAt),
        finalizedBy: i.finalizedByAdmin?.fullName ?? 'Chưa chốt',
        claimed: IncidentReportService.money(i.claimedAmount),
        approved: IncidentReportService.money(i.approvedCompensationAmount),
        taskerBorne: IncidentReportService.money(i.taskerBorneAmount),
        platformBorne: IncidentReportService.money(i.platformBorneAmount),
        recovered: IncidentReportService.money(i.recoverableFromDepositAmount),
        uncovered: IncidentReportService.money(i.uncoveredLiabilityAmount),
        externalPayout: IncidentReportService.money(i.externalPayoutAmount),
      }));

      const subtitle = truncated
        ? `Chi tiết từng sự cố khớp bộ lọc. CHỈ hiển thị ${INCIDENT_EXPORT_MAX_ROWS.toLocaleString('vi-VN')} bản ghi đầu theo thứ tự đang sắp xếp, trên tổng ${total.toLocaleString('vi-VN')} — hãy thu hẹp kỳ lọc để lấy đủ. ${INCIDENT_MONEY_NOTE}`
        : `Chi tiết từng sự cố khớp bộ lọc — tổng ${total.toLocaleString('vi-VN')} sự cố. Bằng chứng, giải trình và ghi chú nội bộ không được xuất. ${INCIDENT_MONEY_NOTE}`;

      const money = (header: string, key: string, width = 16) => ({
        header,
        key,
        width,
        numFmt: VND_FMT,
        sumable: true,
        alignRight: true,
      });

      return {
        name: 'Danh sách sự cố',
        title: 'DANH SÁCH SỰ CỐ BỒI THƯỜNG',
        subtitle,
        filterSummary: await this.buildListFilterSummary(query),
        columns: [
          { header: 'Mã sự cố', key: 'incidentCode', width: 14 },
          { header: 'Tiêu đề', key: 'title', width: 40 },
          { header: 'Loại', key: 'type', width: 20 },
          { header: 'Nguồn', key: 'source', width: 24 },
          { header: 'Mức độ', key: 'severity', width: 14 },
          { header: 'Trạng thái', key: 'status', width: 20 },
          { header: 'Kết cục quyết định', key: 'outcome', width: 26 },
          { header: 'Lý do đóng', key: 'closureReason', width: 18 },
          { header: 'Bên chịu trách nhiệm', key: 'responsibility', width: 22 },
          { header: 'Khách hàng', key: 'customer', width: 22 },
          { header: 'Tasker', key: 'tasker', width: 22 },
          { header: 'Mã booking', key: 'bookingCode', width: 16 },
          { header: 'Ngày báo cáo', key: 'reportedAt', width: 20 },
          { header: 'Hạn ra quyết định', key: 'decisionDueAt', width: 20 },
          { header: 'Chốt quyết định lúc', key: 'finalizedAt', width: 20 },
          { header: 'Kết thúc lúc', key: 'resolvedAt', width: 20 },
          { header: 'Quá hạn quyết định', key: 'overdue', width: 18 },
          {
            header: 'TG tới khi chốt (giờ)',
            key: 'handlingHours',
            width: 19,
            numFmt: HOUR_FMT,
            alignRight: true,
          },
          { header: 'Admin chốt quyết định', key: 'finalizedBy', width: 22 },
          money('Tiền khách yêu cầu', 'claimed', 18),
          money('Tiền duyệt chi', 'approved', 18),
          money('Tasker chịu', 'taskerBorne'),
          money('Nền tảng chịu', 'platformBorne'),
          money('Thu từ ví Tasker', 'recovered', 18),
          money('Chưa thu hồi được', 'uncovered', 18),
          money('Chi ngoài ví', 'externalPayout'),
        ],
        rows,
      };
    }, 'Lỗi khi dựng danh sách sự cố để xuất Excel');
  }

  // ─── Xuất BÁO CÁO ─────────────────────────────────────────────────────────

  getReportFilterSummary(query: ExportIncidentReportDto): string {
    const range = resolveIncidentReportRange(query);
    const label = formatReportRangeLabel(query, range);
    return `Sự cố được báo cáo từ ${label.from} đến ${label.to}`;
  }

  /**
   * 4 sheet báo cáo. Cố ý giữ ít và dày thay vì tách mỏng: 4 kiểu phân loại
   * (trạng thái / mức độ / loại / nguồn) gộp chung MỘT sheet nhờ dùng đúng một
   * bộ cột, nên không sinh ra bảng đầy ô trống.
   */
  async buildReportSheets(
    query: ExportIncidentReportDto,
  ): Promise<ExcelSheetSpec[]> {
    return asyncHandleOperation(async () => {
      const [from, to] = resolveIncidentReportRange(query);
      const filterSummary = this.getReportFilterSummary(query);

      const [
        overview,
        byStatus,
        bySeverity,
        byType,
        bySource,
        byResp,
        byAdmin,
      ] = await Promise.all([
        this.overviewAgg(from, to),
        this.groupBy('status', from, to),
        this.groupBy('severity', from, to),
        this.groupBy('type', from, to),
        this.groupBy('source', from, to),
        this.groupBy('responsibility_party', from, to),
        this.adminPerformance(from, to),
      ]);

      return [
        this.overviewSheet(overview, filterSummary),
        this.distributionSheet(
          { byStatus, bySeverity, byType, bySource },
          overview.total,
          filterSummary,
        ),
        this.responsibilitySheet(byResp, overview.total, filterSummary),
        this.adminSheet(byAdmin, filterSummary),
      ];
    }, 'Lỗi khi dựng báo cáo sự cố để xuất Excel');
  }

  private overviewSheet(o: OverviewAgg, filterSummary: string): ExcelSheetSpec {
    const netPlatform = o.platformBorne + o.externalPayout + o.uncovered;
    return {
      name: 'Tổng quan',
      title: 'BÁO CÁO TỔNG QUAN SỰ CỐ BỒI THƯỜNG',
      subtitle: `Khối lượng, tiến độ thẩm định và dòng tiền bồi thường trong kỳ. ${INCIDENT_MONEY_NOTE}`,
      filterSummary,
      columns: [
        { header: 'Chỉ số', key: 'label', width: 34 },
        {
          header: 'Giá trị',
          key: 'value',
          width: 18,
          numFmt: '#,##0.0',
          alignRight: true,
        },
        { header: 'Đơn vị', key: 'unit', width: 12 },
        { header: 'Ghi chú', key: 'note', width: 56 },
      ],
      rows: [
        {
          label: 'Tổng sự cố',
          value: o.total,
          unit: 'vụ',
          note: 'Sự cố được BÁO CÁO trong kỳ, mọi trạng thái',
        },
        {
          label: 'Đã chốt quyết định',
          value: o.finalized,
          unit: 'vụ',
          note: 'Có mốc chốt quyết định',
        },
        {
          label: 'Đã bồi thường',
          value: o.compensated,
          unit: 'vụ',
          note: 'Trạng thái đã chi trả xong',
        },
        {
          label: 'Bị bác bỏ',
          value: o.rejected,
          unit: 'vụ',
          note: 'Kết luận báo cáo sai sự thật',
        },
        {
          label: 'Quá hạn ra quyết định',
          value: o.overdue,
          unit: 'vụ',
          note: 'Còn mở và đã qua hạn quyết định tại thời điểm xuất file',
        },
        {
          label: 'Tỉ lệ đúng hạn quyết định',
          value:
            Math.round(
              IncidentReportService.pctOf(o.total - o.overdue, o.total) * 1000,
            ) / 10,
          unit: '%',
          note: 'Phần sự cố KHÔNG quá hạn trên tổng trong kỳ',
        },
        {
          label: 'Thời gian tới khi chốt trung bình',
          value: o.avgHoursToFinalize ?? 0,
          unit: 'giờ',
          note: 'Từ lúc khách báo cáo tới lúc admin chốt quyết định',
        },
        {
          label: 'Tổng tiền khách yêu cầu',
          value: o.claimed,
          unit: 'đ',
          note: 'Tổng giá trị kê khai ban đầu, trước thẩm định',
        },
        {
          label: 'Tổng tiền duyệt chi',
          value: o.approved,
          unit: 'đ',
          note: 'Số thực duyệt bồi thường cho khách (= Tasker chịu + Nền tảng chịu)',
        },
        {
          label: 'Tỉ lệ duyệt trên yêu cầu',
          value:
            Math.round(
              IncidentReportService.pctOf(o.approved, o.claimed) * 1000,
            ) / 10,
          unit: '%',
          note: 'Duyệt chi so với số khách kê khai',
        },
        {
          label: '— Trong đó Tasker chịu',
          value: o.taskerBorne,
          unit: 'đ',
          note: 'Phần quy trách nhiệm cho Tasker',
        },
        {
          label: '— Trong đó nền tảng chịu',
          value: o.platformBorne,
          unit: 'đ',
          note: 'Phần CleanZ chịu theo quyết định phân bổ',
        },
        {
          label: 'Đã thu từ ví Tasker',
          value: o.recovered,
          unit: 'đ',
          note: 'Phần thu hồi được từ số dư ví Tasker',
        },
        {
          label: 'Chưa thu hồi được',
          value: o.uncovered,
          unit: 'đ',
          note: 'Tasker chịu nhưng ví không đủ — nền tảng đang ứng',
        },
        {
          label: 'Chi ngoài ví (chuyển khoản)',
          value: o.externalPayout,
          unit: 'đ',
          note: 'Chi trả thủ công, không có bút toán ví tương ứng',
        },
        {
          label: 'Nền tảng thực chịu',
          value: netPlatform,
          unit: 'đ',
          note: 'Nền tảng chịu + chi ngoài ví + phần chưa thu hồi được',
        },
      ],
    };
  }

  private distributionSheet(
    groups: {
      byStatus: GroupRow[];
      bySeverity: GroupRow[];
      byType: GroupRow[];
      bySource: GroupRow[];
    },
    total: number,
    filterSummary: string,
  ): ExcelSheetSpec {
    const section = (
      groupName: string,
      rows: GroupRow[],
      labels: Record<string, string>,
    ) =>
      rows.map((r) => ({
        group: groupName,
        label: incLabel(labels, r.k, 'Chưa xác định'),
        count: r.c,
        pct: IncidentReportService.pctOf(r.c, total),
        approved: IncidentReportService.money(r.approved),
        taskerBorne: IncidentReportService.money(r.tasker_borne),
        platformBorne: IncidentReportService.money(r.platform_borne),
      }));

    return {
      name: 'Phân bố',
      title: 'PHÂN BỐ SỰ CỐ THEO TỪNG CÁCH PHÂN LOẠI',
      subtitle: `Bốn cách phân loại xếp chung một bảng, phân biệt bằng cột "Nhóm phân loại" — dùng bộ lọc trên cột đó để xem riêng từng nhóm. Sheet này KHÔNG có dòng tổng vì mỗi cách phân loại đều đếm hết tập sự cố, cộng cả bảng sẽ ra gấp bốn lần. ${INCIDENT_MONEY_NOTE}`,
      filterSummary,
      // KHÔNG cột nào `sumable` ở sheet này. Bốn cách phân loại mỗi cách đều
      // đếm HẾT tập sự cố, nên một dòng TỔNG CỘNG ở cuối sẽ bằng 4 LẦN tổng
      // thật — một con số sai in đậm còn tệ hơn là không có dòng tổng. Người
      // đọc lọc cột "Nhóm phân loại" rồi để Excel tự tính là ra số đúng.
      columns: [
        { header: 'Nhóm phân loại', key: 'group', width: 20 },
        { header: 'Giá trị', key: 'label', width: 28 },
        { header: 'Số sự cố', key: 'count', width: 12, alignRight: true },
        {
          header: '% trong nhóm',
          key: 'pct',
          width: 14,
          numFmt: '0.0%',
          alignRight: true,
        },
        {
          header: 'Tiền duyệt chi',
          key: 'approved',
          width: 18,
          numFmt: VND_FMT,
          alignRight: true,
        },
        {
          header: 'Tasker chịu',
          key: 'taskerBorne',
          width: 16,
          numFmt: VND_FMT,
          alignRight: true,
        },
        {
          header: 'Nền tảng chịu',
          key: 'platformBorne',
          width: 16,
          numFmt: VND_FMT,
          alignRight: true,
        },
      ],
      rows: [
        ...section('Trạng thái', groups.byStatus, INC_STATUS_LABEL_VI),
        ...section('Mức độ', groups.bySeverity, INC_SEVERITY_LABEL_VI),
        ...section('Loại sự cố', groups.byType, INC_TYPE_LABEL_VI),
        ...section('Nguồn tạo', groups.bySource, INC_SOURCE_LABEL_VI),
      ],
    };
  }

  private responsibilitySheet(
    rows: GroupRow[],
    total: number,
    filterSummary: string,
  ): ExcelSheetSpec {
    return {
      name: 'Trách nhiệm & phân bổ',
      title: 'QUY TRÁCH NHIỆM VÀ PHÂN BỔ TIỀN BỒI THƯỜNG',
      subtitle: `Ai chịu tiền cho nhóm sự cố nào. ${INCIDENT_MONEY_NOTE}`,
      filterSummary,
      columns: [
        { header: 'Bên chịu trách nhiệm', key: 'label', width: 26 },
        {
          header: 'Số sự cố',
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
          header: 'Tiền duyệt chi',
          key: 'approved',
          width: 18,
          numFmt: VND_FMT,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Tasker chịu',
          key: 'taskerBorne',
          width: 16,
          numFmt: VND_FMT,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Nền tảng chịu',
          key: 'platformBorne',
          width: 16,
          numFmt: VND_FMT,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'TB duyệt chi / vụ',
          key: 'avgApproved',
          width: 18,
          numFmt: VND_FMT,
          alignRight: true,
        },
      ],
      rows: rows.map((r) => {
        const approved = IncidentReportService.money(r.approved);
        return {
          label: incLabel(
            INC_RESPONSIBILITY_LABEL_VI,
            r.k,
            'Chưa quy trách nhiệm',
          ),
          count: r.c,
          pct: IncidentReportService.pctOf(r.c, total),
          approved,
          taskerBorne: IncidentReportService.money(r.tasker_borne),
          platformBorne: IncidentReportService.money(r.platform_borne),
          avgApproved: r.c > 0 ? Math.round(approved / r.c) : 0,
        };
      }),
    };
  }

  private adminSheet(
    rows: AdminPerfRow[],
    filterSummary: string,
  ): ExcelSheetSpec {
    return {
      name: 'Hiệu suất thẩm định',
      title: 'HIỆU SUẤT THẨM ĐỊNH THEO ADMIN CHỐT QUYẾT ĐỊNH',
      subtitle:
        'Tính theo người CHỐT quyết định. Dòng "Chưa chốt" là sự cố còn đang thẩm định hoặc đã đóng mà không ra quyết định.',
      filterSummary,
      columns: [
        { header: 'Admin chốt quyết định', key: 'name', width: 26 },
        {
          header: 'Số sự cố',
          key: 'count',
          width: 12,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Bồi thường',
          key: 'compensate',
          width: 14,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Không bồi thường',
          key: 'noComp',
          width: 17,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'Bác bỏ',
          key: 'reject',
          width: 12,
          sumable: true,
          alignRight: true,
        },
        {
          header: 'TG tới khi chốt TB (giờ)',
          key: 'avgHours',
          width: 22,
          numFmt: HOUR_FMT,
          alignRight: true,
        },
        {
          header: 'Tiền duyệt chi',
          key: 'approved',
          width: 18,
          numFmt: VND_FMT,
          sumable: true,
          alignRight: true,
        },
      ],
      rows: rows.map((r) => ({
        name: r.name,
        count: r.c,
        compensate: r.compensate,
        noComp: r.no_comp,
        reject: r.reject,
        avgHours: r.avg_mins === null ? '—' : Number(r.avg_mins) / 60,
        approved: IncidentReportService.money(r.approved),
      })),
    };
  }

  // ─── Truy vấn tổng hợp ────────────────────────────────────────────────────
  // Aggregate bằng SQL thuần (không nạp entity) và luôn bound theo kỳ
  // `[from, to)` trên `reported_at`.

  private async overviewAgg(from: Date, to: Date): Promise<OverviewAgg> {
    const rows: OverviewRaw[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE finalized_at IS NOT NULL)::int AS finalized,
              COUNT(*) FILTER (WHERE status = 'COMPENSATED')::int AS compensated,
              COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
              COUNT(*) FILTER (
                WHERE decision_due_at IS NOT NULL
                  AND decision_due_at < now()
                  AND status <> 'CLOSED'
              )::int AS overdue,
              AVG(EXTRACT(EPOCH FROM (finalized_at - reported_at)) / 60)
                FILTER (WHERE finalized_at IS NOT NULL) AS avg_mins,
              COALESCE(SUM(claimed_amount), 0) AS claimed,
              COALESCE(SUM(approved_compensation_amount), 0) AS approved,
              COALESCE(SUM(tasker_borne_amount), 0) AS tasker_borne,
              COALESCE(SUM(platform_borne_amount), 0) AS platform_borne,
              COALESCE(SUM(recoverable_from_deposit_amount), 0) AS recovered,
              COALESCE(SUM(uncovered_liability_amount), 0) AS uncovered,
              COALESCE(SUM(external_payout_amount), 0) AS external_payout
       FROM incidents
       WHERE reported_at >= $1 AND reported_at < $2`,
      [from, to],
    );

    const r = rows[0];
    const avg = r?.avg_mins == null ? null : Number(r.avg_mins) / 60;
    return {
      total: Number(r?.total ?? 0),
      finalized: Number(r?.finalized ?? 0),
      compensated: Number(r?.compensated ?? 0),
      rejected: Number(r?.rejected ?? 0),
      overdue: Number(r?.overdue ?? 0),
      avgHoursToFinalize: avg === null ? null : Math.round(avg * 10) / 10,
      claimed: IncidentReportService.money(r?.claimed),
      approved: IncidentReportService.money(r?.approved),
      taskerBorne: IncidentReportService.money(r?.tasker_borne),
      platformBorne: IncidentReportService.money(r?.platform_borne),
      recovered: IncidentReportService.money(r?.recovered),
      uncovered: IncidentReportService.money(r?.uncovered),
      externalPayout: IncidentReportService.money(r?.external_payout),
    };
  }

  /**
   * Đếm + cộng tiền theo một cột phân loại. Tên cột do CODE truyền vào (danh
   * sách đóng ở `buildReportSheets`), không bao giờ đến từ input người dùng.
   */
  private groupBy(
    column: 'status' | 'severity' | 'type' | 'source' | 'responsibility_party',
    from: Date,
    to: Date,
  ): Promise<GroupRow[]> {
    return this.dataSource.query(
      `SELECT ${column} AS k,
              COUNT(*)::int AS c,
              COALESCE(SUM(approved_compensation_amount), 0) AS approved,
              COALESCE(SUM(tasker_borne_amount), 0) AS tasker_borne,
              COALESCE(SUM(platform_borne_amount), 0) AS platform_borne
       FROM incidents
       WHERE reported_at >= $1 AND reported_at < $2
       GROUP BY ${column}
       ORDER BY c DESC`,
      [from, to],
    );
  }

  private adminPerformance(from: Date, to: Date): Promise<AdminPerfRow[]> {
    // GROUP BY theo id chứ không theo tên: hai admin trùng tên sẽ bị gộp thành
    // một dòng với số liệu cộng dồn, mà đây đúng là bảng dùng để đánh giá người.
    return this.dataSource.query(
      `SELECT COALESCE(u.full_name, 'Chưa chốt') AS name,
              COUNT(*)::int AS c,
              COUNT(*) FILTER (WHERE i.decision_outcome = 'COMPENSATE')::int AS compensate,
              COUNT(*) FILTER (WHERE i.decision_outcome = 'NO_COMPENSATION')::int AS no_comp,
              COUNT(*) FILTER (WHERE i.decision_outcome = 'REJECT')::int AS reject,
              AVG(EXTRACT(EPOCH FROM (i.finalized_at - i.reported_at)) / 60)
                FILTER (WHERE i.finalized_at IS NOT NULL) AS avg_mins,
              COALESCE(SUM(i.approved_compensation_amount), 0) AS approved
       FROM incidents i
       LEFT JOIN users u ON u.id = i.finalized_by_admin_id
       WHERE i.reported_at >= $1 AND i.reported_at < $2
       GROUP BY i.finalized_by_admin_id, u.full_name
       ORDER BY c DESC, name ASC`,
      [from, to],
    );
  }
}

interface OverviewRaw {
  total: number;
  finalized: number;
  compensated: number;
  rejected: number;
  overdue: number;
  avg_mins: string | null;
  claimed: string;
  approved: string;
  tasker_borne: string;
  platform_borne: string;
  recovered: string;
  uncovered: string;
  external_payout: string;
}

interface OverviewAgg {
  total: number;
  finalized: number;
  compensated: number;
  rejected: number;
  overdue: number;
  avgHoursToFinalize: number | null;
  claimed: number;
  approved: number;
  taskerBorne: number;
  platformBorne: number;
  recovered: number;
  uncovered: number;
  externalPayout: number;
}

interface AdminPerfRow {
  name: string;
  c: number;
  compensate: number;
  no_comp: number;
  reject: number;
  avg_mins: string | null;
  approved: string;
}

/** Đổi thẳng chuỗi 'YYYY-MM-DD' sang 'DD/MM/YYYY', không đi qua `Date`. */
function formatDateStr(value?: string): string {
  if (!value) return '…';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
