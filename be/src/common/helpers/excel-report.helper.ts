import ExcelJS from 'exceljs';

export interface ExcelColumnSpec {
  header: string;
  key: string;
  width?: number;
  /** Excel number format, ví dụ '#,##0" đ"' cho tiền tệ, '0.0%' cho phần trăm. */
  numFmt?: string;
  /** Có cộng tổng ở dòng cuối sheet không (chỉ áp dụng cột số). */
  sumable?: boolean;
  /** Căn phải cho cột số — mặc định căn trái. */
  alignRight?: boolean;
}

export interface ExcelSheetSpec {
  /** Tên tab sheet (tối đa 31 ký tự, Excel giới hạn). */
  name: string;
  /** Tiêu đề lớn hiển thị ở đầu sheet. */
  title: string;
  /** Mô tả ngắn ý nghĩa dữ liệu trong sheet. */
  subtitle?: string;
  /** Chuỗi mô tả bộ lọc đang áp dụng khi xuất — giúp người xem biết phạm vi dữ liệu. */
  filterSummary?: string;
  columns: ExcelColumnSpec[];
  rows: Record<string, unknown>[];
}

const BRAND_ORANGE = 'FFFFA000';
const HEADER_NAVY = 'FF0F1B33';
const TOTALS_FILL = 'FFFFF3E0';
const BAND_FILL = 'FFF9FAFB';
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

/**
 * Dựng 1 sheet "chuyên nghiệp": banner tiêu đề + mô tả + bộ lọc đang áp dụng,
 * bảng dữ liệu có autofilter/border/băng màu xen kẽ, và dòng TỔNG CỘNG cộng
 * SUM thật (công thức Excel, không phải số tĩnh) cho các cột đánh dấu sumable.
 * Dùng chung cho export từng mục riêng lẻ và export báo cáo tổng nhiều sheet.
 */
export async function buildReportWorkbookBuffer(
  sheets: ExcelSheetSpec[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CleanZ Admin';
  workbook.created = new Date();

  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name.slice(0, 31));
    const colCount = spec.columns.length;

    // ── Banner: tiêu đề ──
    sheet.mergeCells(1, 1, 1, colCount);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = spec.title;
    titleCell.font = { bold: true, size: 15, color: { argb: HEADER_NAVY } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(1).height = 26;

    let cursor = 2;

    if (spec.subtitle) {
      sheet.mergeCells(cursor, 1, cursor, colCount);
      const c = sheet.getCell(cursor, 1);
      c.value = spec.subtitle;
      c.font = { italic: true, size: 10, color: { argb: 'FF6E7A92' } };
      cursor += 1;
    }

    if (spec.filterSummary) {
      sheet.mergeCells(cursor, 1, cursor, colCount);
      const c = sheet.getCell(cursor, 1);
      c.value = `Bộ lọc áp dụng: ${spec.filterSummary}`;
      c.font = { size: 10, color: { argb: 'FF6E7A92' } };
      cursor += 1;
    }

    sheet.mergeCells(cursor, 1, cursor, colCount);
    const genCell = sheet.getCell(cursor, 1);
    genCell.value = `Xuất lúc: ${new Date().toLocaleString('vi-VN')}`;
    genCell.font = { size: 9, italic: true, color: { argb: 'FF94A3B8' } };
    cursor += 2; // 1 dòng trống trước bảng

    const headerRowNumber = cursor;
    const headerRow = sheet.getRow(headerRowNumber);
    spec.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_ORANGE },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.alignRight ? 'right' : 'left',
      };
      cell.border = THIN_BORDER;
    });
    headerRow.height = 20;

    spec.columns.forEach((col, i) => {
      const column = sheet.getColumn(i + 1);
      const longest = spec.rows.reduce((max, r) => {
        const v = r[col.key];
        const len = v === null || v === undefined ? 0 : String(v).length;
        return Math.max(max, len);
      }, col.header.length);
      column.width = col.width ?? Math.min(Math.max(longest + 3, 12), 44);
    });

    const firstDataRow = headerRowNumber + 1;
    spec.rows.forEach((row, rowIndex) => {
      const excelRow = sheet.getRow(firstDataRow + rowIndex);
      spec.columns.forEach((col, i) => {
        const cell = excelRow.getCell(i + 1);
        cell.value = (row[col.key] ?? '') as ExcelJS.CellValue;
        if (col.numFmt) cell.numFmt = col.numFmt;
        cell.alignment = {
          horizontal: col.alignRight ? 'right' : 'left',
          vertical: 'middle',
        };
        cell.border = THIN_BORDER;
        if (rowIndex % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: BAND_FILL },
          };
        }
      });
    });

    const lastDataRow = firstDataRow + spec.rows.length - 1;
    const hasSumable = spec.columns.some((c) => c.sumable);

    if (hasSumable && spec.rows.length > 0) {
      const totalsRowNumber = lastDataRow + 1;
      const totalsRow = sheet.getRow(totalsRowNumber);
      spec.columns.forEach((col, i) => {
        const cell = totalsRow.getCell(i + 1);
        const letter = sheet.getColumn(i + 1).letter;
        if (i === 0) {
          cell.value = 'TỔNG CỘNG';
        } else if (col.sumable) {
          cell.value = {
            formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`,
          };
          if (col.numFmt) cell.numFmt = col.numFmt;
        }
        cell.font = { bold: true, color: { argb: HEADER_NAVY } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: TOTALS_FILL },
        };
        cell.alignment = {
          horizontal: col.alignRight ? 'right' : 'left',
          vertical: 'middle',
        };
        cell.border = THIN_BORDER;
      });
    }

    if (spec.rows.length > 0) {
      sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber, column: colCount },
      };
    }

    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Dựng 1 file .xlsx CHỈ 1 SHEET DUY NHẤT, gộp nhiều mục báo cáo xếp chồng theo
 * chiều dọc — mỗi mục có dải tiêu đề riêng (đánh số thứ tự), bảng dữ liệu
 * riêng, dòng TỔNG CỘNG riêng, cách nhau vài dòng trống. Dùng khi người xem
 * muốn cuộn xem hết toàn bộ báo cáo trong 1 trang tính, không cần đổi tab.
 */
export async function buildCombinedSingleSheetBuffer(
  sections: ExcelSheetSpec[],
  overallTitle: string,
  filterSummary: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CleanZ Admin';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Báo cáo tổng hợp');
  const maxCols = Math.max(1, ...sections.map((s) => s.columns.length));
  const colWidths: number[] = new Array(maxCols).fill(10);

  sheet.mergeCells(1, 1, 1, maxCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = overallTitle;
  titleCell.font = { bold: true, size: 17, color: { argb: HEADER_NAVY } };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, maxCols);
  const filterCell = sheet.getCell(2, 1);
  filterCell.value = `Bộ lọc áp dụng: ${filterSummary}`;
  filterCell.font = { size: 10.5, color: { argb: 'FF6E7A92' } };

  sheet.mergeCells(3, 1, 3, maxCols);
  const genCell = sheet.getCell(3, 1);
  genCell.value = `Xuất lúc: ${new Date().toLocaleString('vi-VN')}  ·  Gồm ${sections.length} mục, xếp lần lượt bên dưới`;
  genCell.font = { size: 9, italic: true, color: { argb: 'FF94A3B8' } };

  let cursor = 5;

  sections.forEach((section, sectionIndex) => {
    sheet.mergeCells(cursor, 1, cursor, maxCols);
    const dividerCell = sheet.getCell(cursor, 1);
    dividerCell.value = `${sectionIndex + 1}. ${section.title.replace(/^BÁO CÁO /i, '')}`;
    dividerCell.font = { bold: true, size: 12.5, color: { argb: 'FFFFFFFF' } };
    dividerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_NAVY },
    };
    dividerCell.alignment = { vertical: 'middle', indent: 1 };
    sheet.getRow(cursor).height = 24;
    cursor += 1;

    if (section.subtitle) {
      sheet.mergeCells(cursor, 1, cursor, maxCols);
      const c = sheet.getCell(cursor, 1);
      c.value = section.subtitle;
      c.font = { italic: true, size: 9.5, color: { argb: 'FF6E7A92' } };
      cursor += 1;
    }

    const headerRowNumber = cursor;
    section.columns.forEach((col, i) => {
      const cell = sheet.getCell(headerRowNumber, i + 1);
      cell.value = col.header;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_ORANGE },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.alignRight ? 'right' : 'left',
      };
      colWidths[i] = Math.max(colWidths[i], col.header.length + 2);
    });
    sheet.getRow(headerRowNumber).height = 20;
    cursor += 1;

    const firstDataRow = cursor;

    if (section.rows.length === 0) {
      sheet.mergeCells(cursor, 1, cursor, Math.max(section.columns.length, 1));
      const emptyCell = sheet.getCell(cursor, 1);
      emptyCell.value = 'Không có dữ liệu trong phạm vi bộ lọc.';
      emptyCell.font = { italic: true, color: { argb: 'FF94A3B8' } };
      emptyCell.border = THIN_BORDER;
      cursor += 1;
    } else {
      section.rows.forEach((row, rowIndex) => {
        const excelRowNumber = firstDataRow + rowIndex;
        section.columns.forEach((col, i) => {
          const cell = sheet.getCell(excelRowNumber, i + 1);
          cell.value = (row[col.key] ?? '') as ExcelJS.CellValue;
          if (col.numFmt) cell.numFmt = col.numFmt;
          cell.border = THIN_BORDER;
          cell.alignment = {
            horizontal: col.alignRight ? 'right' : 'left',
            vertical: 'middle',
          };
          if (rowIndex % 2 === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: BAND_FILL },
            };
          }
          const v = row[col.key];
          const len = v === null || v === undefined ? 0 : String(v).length;
          colWidths[i] = Math.max(colWidths[i], len + 2);
        });
      });
      cursor += section.rows.length;

      const lastDataRow = cursor - 1;
      const hasSumable = section.columns.some((c) => c.sumable);
      if (hasSumable) {
        section.columns.forEach((col, i) => {
          const cell = sheet.getCell(cursor, i + 1);
          const letter = sheet.getColumn(i + 1).letter;
          if (i === 0) {
            cell.value = 'TỔNG CỘNG';
          } else if (col.sumable) {
            cell.value = {
              formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`,
            };
            if (col.numFmt) cell.numFmt = col.numFmt;
          }
          cell.font = { bold: true, color: { argb: HEADER_NAVY } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: TOTALS_FILL },
          };
          cell.border = THIN_BORDER;
          cell.alignment = {
            horizontal: col.alignRight ? 'right' : 'left',
            vertical: 'middle',
          };
        });
        cursor += 1;
      }
    }

    cursor += 2; // khoảng trống trước mục kế tiếp
  });

  colWidths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = Math.min(Math.max(w, 12), 40);
  });

  sheet.views = [{ state: 'frozen', ySplit: 4 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function excelFilename(reportName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${reportName}_${date}.xlsx`;
}
