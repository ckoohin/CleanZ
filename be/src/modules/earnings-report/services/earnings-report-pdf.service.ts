import { join } from 'path';
import { Injectable } from '@nestjs/common';
import PdfPrinter from 'pdfmake/src/printer';
import type {
  Content,
  ContentTable,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { formatVnd } from 'src/common/helpers/number.helper';
import { VIETNAM_UTC_OFFSET_MS } from 'src/common/helpers/earnings-period.helper';
import { MAX_DETAIL_ROWS } from '../earnings-report.constants';
import type { EarningsReportData } from './earnings-report-data.service';

/** Đồng bộ với bảng màu báo cáo Excel (`excel-report.helper.ts`). */
const NAVY = '#0F1B33';
const ORANGE = '#FFA000';
const MUTED = '#6B7280';
const BAND = '#F9FAFB';
const TOTALS = '#FFF3E0';

/**
 * Font phải nhúng TTF: bộ font chuẩn của PDF (Helvetica…) dùng WinAnsi, không có
 * dấu tiếng Việt. Roboto lấy từ package pdfmake và commit vào `assets/fonts`;
 * `nest-cli.json` khai thêm pattern `.ttf` vào `assets` để file được copy sang
 * `dist` khi build — thiếu bước này thì dev chạy được mà bản build sẽ lỗi.
 */
const FONT_DIR = join(__dirname, '..', 'assets', 'fonts');

const FONTS = {
  Roboto: {
    normal: join(FONT_DIR, 'Roboto-Regular.ttf'),
    bold: join(FONT_DIR, 'Roboto-Medium.ttf'),
    italics: join(FONT_DIR, 'Roboto-Italic.ttf'),
    bolditalics: join(FONT_DIR, 'Roboto-MediumItalic.ttf'),
  },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  WALLET: 'Ví CleanZ',
  ONLINE: 'Chuyển khoản',
};

/** `completed_at` lưu theo giờ VN — cộng offset để `getUTC*` đọc ra đúng số. */
function vnDateTime(value: Date | null): string {
  if (!value) return '—';
  const d = new Date(new Date(value).getTime() + VIETNAM_UTC_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function vnDate(value: Date): string {
  const d = new Date(value.getTime() + VIETNAM_UTC_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

@Injectable()
export class EarningsReportPdfService {
  private readonly printer = new PdfPrinter(FONTS);

  /** Tên file đính kèm, ví dụ `bang-ke-thu-nhap_thang_2026-07-01.pdf`. */
  buildFileName(periodLabel: string, periodStartKey: string): string {
    return `bang-ke-thu-nhap_${periodLabel}_${periodStartKey}.pdf`;
  }

  buildPdf(data: EarningsReportData): Promise<Buffer> {
    const doc = this.printer.createPdfKitDocument(this.buildDefinition(data));

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  private buildDefinition(data: EarningsReportData): TDocumentDefinitions {
    const { bookings } = data;
    const truncated = Math.max(bookings.length - MAX_DETAIL_ROWS, 0);
    const detailRows =
      truncated > 0 ? bookings.slice(-MAX_DETAIL_ROWS) : bookings;

    const content: Content[] = [
      this.header(data),
      this.partnerBlock(data),
      { text: 'TỔNG QUAN', style: 'section' },
      this.summaryTable(data),
      { text: 'DIỄN BIẾN THEO KỲ', style: 'section' },
      this.dailyTable(data),
      { text: 'CHI TIẾT TỪNG ĐƠN', style: 'section' },
      this.detailTable(data, detailRows),
    ];

    if (truncated > 0) {
      content.push({
        text: `Còn ${truncated} đơn không hiển thị trong bản kê này — xem đầy đủ trong ứng dụng CleanZ.`,
        style: 'note',
        margin: [0, 6, 0, 0],
      });
    }

    content.push(this.notes(data));

    return {
      pageSize: 'A4',
      pageMargins: [32, 36, 32, 44],
      defaultStyle: { font: 'Roboto', fontSize: 9, color: '#111827' },
      styles: {
        section: {
          fontSize: 11,
          bold: true,
          color: NAVY,
          margin: [0, 16, 0, 6],
        },
        th: { bold: true, fontSize: 9, color: '#FFFFFF' },
        note: { fontSize: 8, color: MUTED },
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: 'CleanZ — Bảng kê thu nhập đối tác',
            style: 'note',
            margin: [32, 0, 0, 0],
          },
          {
            text: `Trang ${currentPage}/${pageCount}`,
            style: 'note',
            alignment: 'right',
            margin: [0, 0, 32, 0],
          },
        ],
      }),
      content,
    };
  }

  private header(data: EarningsReportData): ContentTable {
    return {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            {
              stack: [
                { text: 'CleanZ', fontSize: 16, bold: true, color: ORANGE },
                {
                  text: 'BẢNG KÊ THU NHẬP',
                  fontSize: 13,
                  bold: true,
                  color: '#FFFFFF',
                  margin: [0, 2, 0, 0],
                },
                {
                  text: data.period.rangeLabel,
                  fontSize: 10,
                  color: '#D1D5DB',
                  margin: [0, 2, 0, 0],
                },
              ],
              border: [false, false, false, false],
              fillColor: NAVY,
              margin: [10, 10, 10, 10],
            },
            {
              stack: [
                { text: 'Ngày xuất', fontSize: 8, color: '#9CA3AF' },
                {
                  text: vnDate(data.generatedAt),
                  fontSize: 10,
                  color: '#FFFFFF',
                  bold: true,
                },
              ],
              border: [false, false, false, false],
              fillColor: NAVY,
              alignment: 'right',
              margin: [10, 10, 10, 10],
            },
          ],
        ],
      },
      layout: 'noBorders',
    };
  }

  private partnerBlock(data: EarningsReportData): ContentTable {
    const { tasker } = data;
    const bank = tasker.bankAccountMasked
      ? `${tasker.bankName ?? ''} ${tasker.bankAccountMasked}`.trim()
      : 'Chưa cập nhật';

    return {
      margin: [0, 14, 0, 0],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            { text: 'Đối tác', style: 'note' },
            { text: tasker.fullName, bold: true },
            { text: 'Mã đối tác', style: 'note' },
            { text: tasker.id, fontSize: 8 },
          ],
          [
            { text: 'Email', style: 'note' },
            { text: tasker.email },
            { text: 'Tài khoản nhận', style: 'note' },
            { text: bank },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#E5E7EB',
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
    };
  }

  private summaryTable(data: EarningsReportData): ContentTable {
    const { summary } = data;
    const cell = (
      label: string,
      value: string,
      highlight = false,
    ): TableCell => ({
      stack: [
        { text: label, fontSize: 8, color: MUTED },
        {
          text: value,
          fontSize: highlight ? 12 : 10,
          bold: true,
          color: highlight ? ORANGE : NAVY,
          margin: [0, 3, 0, 0],
        },
      ],
      fillColor: highlight ? TOTALS : BAND,
      margin: [8, 8, 8, 8],
    });

    return {
      table: {
        widths: ['*', '*', '*', '*', '*'],
        body: [
          [
            cell('Tổng doanh thu', formatVnd(summary.grossRevenue)),
            cell('Phí nền tảng', formatVnd(summary.platformFee)),
            cell('Thu nhập thực nhận', formatVnd(summary.netIncome), true),
            cell('Đơn hoàn thành', String(summary.completedBookings)),
            cell('TB mỗi đơn', formatVnd(summary.avgPerBooking)),
          ],
        ],
      },
      layout: 'noBorders',
    };
  }

  private dailyTable(data: EarningsReportData): ContentTable {
    const head: TableCell[] = [
      { text: data.period.type === 'year' ? 'Tháng' : 'Ngày', style: 'th' },
      { text: 'Số đơn', style: 'th', alignment: 'right' },
      { text: 'Doanh thu', style: 'th', alignment: 'right' },
      { text: 'Phí nền tảng', style: 'th', alignment: 'right' },
      { text: 'Thực nhận', style: 'th', alignment: 'right' },
    ];

    const body: TableCell[][] = [head];
    for (const row of data.daily) {
      body.push([
        { text: row.label },
        { text: String(row.bookings), alignment: 'right' },
        { text: formatVnd(row.grossRevenue), alignment: 'right' },
        { text: formatVnd(row.platformFee), alignment: 'right' },
        { text: formatVnd(row.netIncome), alignment: 'right', bold: true },
      ]);
    }

    if (data.daily.length === 0) {
      body.push([
        {
          text: 'Không có đơn hoàn thành trong kỳ.',
          colSpan: 5,
          alignment: 'center',
          color: MUTED,
        },
        {},
        {},
        {},
        {},
      ]);
    } else {
      body.push([
        { text: 'TỔNG', bold: true, fillColor: TOTALS },
        {
          text: String(data.summary.completedBookings),
          alignment: 'right',
          bold: true,
          fillColor: TOTALS,
        },
        {
          text: formatVnd(data.summary.grossRevenue),
          alignment: 'right',
          bold: true,
          fillColor: TOTALS,
        },
        {
          text: formatVnd(data.summary.platformFee),
          alignment: 'right',
          bold: true,
          fillColor: TOTALS,
        },
        {
          text: formatVnd(data.summary.netIncome),
          alignment: 'right',
          bold: true,
          fillColor: TOTALS,
        },
      ]);
    }

    return {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body,
      },
      layout: this.tableLayout(),
    };
  }

  private detailTable(
    data: EarningsReportData,
    rows: EarningsReportData['bookings'],
  ): ContentTable {
    const head: TableCell[] = [
      { text: 'Mã đơn', style: 'th' },
      { text: 'Hoàn thành', style: 'th' },
      { text: 'Dịch vụ', style: 'th' },
      { text: 'Thanh toán', style: 'th' },
      { text: 'Tổng tiền', style: 'th', alignment: 'right' },
      { text: 'Phụ thu', style: 'th', alignment: 'right' },
      { text: 'Phí NT', style: 'th', alignment: 'right' },
      { text: 'Thực nhận', style: 'th', alignment: 'right' },
    ];

    const body: TableCell[][] = [head];

    for (const row of rows) {
      body.push([
        {
          text: row.isEstimated ? `${row.bookingCode} *` : row.bookingCode,
          fontSize: 8,
        },
        { text: vnDateTime(row.completedAt), fontSize: 8 },
        { text: row.serviceName ?? '—', fontSize: 8 },
        {
          text: PAYMENT_METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod,
          fontSize: 8,
        },
        { text: formatVnd(row.subtotal), alignment: 'right', fontSize: 8 },
        {
          text: row.surchargeAmount > 0 ? formatVnd(row.surchargeAmount) : '—',
          alignment: 'right',
          fontSize: 8,
        },
        {
          text: formatVnd(row.platformCommission),
          alignment: 'right',
          fontSize: 8,
        },
        {
          text: formatVnd(row.taskerEarning),
          alignment: 'right',
          fontSize: 8,
          bold: true,
        },
      ]);
    }

    if (rows.length === 0) {
      body.push([
        {
          text: 'Không có đơn hoàn thành trong kỳ.',
          colSpan: 8,
          alignment: 'center',
          color: MUTED,
        },
        {},
        {},
        {},
        {},
        {},
        {},
        {},
      ]);
    }

    return {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body,
      },
      layout: this.tableLayout(),
    };
  }

  private notes(data: EarningsReportData): Content {
    const lines = [
      'Số tiền làm tròn đến đồng (VND). Mốc tính là thời điểm đơn hoàn thành, theo múi giờ Asia/Ho_Chi_Minh.',
    ];

    if (data.summary.estimatedBookings > 0) {
      lines.push(
        `(*) ${data.summary.estimatedBookings} đơn chưa có bút toán quyết toán — số tiền là ước tính theo mức hoa hồng mặc định và có thể thay đổi sau khi chốt sổ.`,
      );
    }

    return {
      margin: [0, 16, 0, 0],
      stack: [
        { text: 'Ghi chú', fontSize: 9, bold: true, color: NAVY },
        {
          ul: lines,
          style: 'note',
          margin: [0, 4, 0, 0],
        },
      ],
    };
  }

  /** Kẻ ngang mảnh, header nền navy, dòng chẵn nền xám nhạt cho dễ dò. */
  private tableLayout() {
    return {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#E5E7EB',
      fillColor: (rowIndex: number) => {
        if (rowIndex === 0) return NAVY;
        return rowIndex % 2 === 0 ? BAND : null;
      },
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 5,
      paddingRight: () => 5,
    };
  }
}
