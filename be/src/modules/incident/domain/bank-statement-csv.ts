import { BankStatementDirection } from 'src/common/enums/bank-statement-entry.enum';

/**
 * Đọc file sao kê ngân hàng dạng CSV.
 *
 * Hàm THUẦN, không chạm DB — mọi quy tắc dễ sai (định dạng số kiểu Việt Nam, ngày
 * dd/MM/yyyy, chiều tiền suy từ dấu) đều kiểm được bằng unit test thay vì phải dựng
 * một file thật và một database.
 *
 * Không dùng thư viện CSV: định dạng ở đây là một tập con hẹp (dấu phẩy hoặc chấm phẩy,
 * ngoặc kép để bọc trường có dấu phân cách) và thêm một phụ thuộc chỉ để tách chuỗi thì
 * đắt hơn ba chục dòng này.
 */

export interface ParsedBankStatementRow {
  bankRef: string;
  txnAt: Date;
  direction: BankStatementDirection;
  amount: number;
  counterpartyAccount: string | null;
  counterpartyName: string | null;
  description: string | null;
  rawLine: string;
}

export interface BankStatementParseError {
  /** Số dòng trong file (tính cả dòng tiêu đề) — để người nhập tìm đúng chỗ mà sửa. */
  line: number;
  message: string;
}

export interface BankStatementParseResult {
  rows: ParsedBankStatementRow[];
  errors: BankStatementParseError[];
}

/**
 * Chuẩn hoá tên cột về snake_case chỉ gồm [a-z0-9_].
 *
 * Bộ lọc cuối cũng chính là thứ nuốt luôn BOM mà Excel dán vào đầu tên cột đầu tiên —
 * không cần luật riêng cho nó, nhưng nếu bỏ bước này thì file xuất từ Excel sẽ báo
 * "thiếu cột bắt buộc" một cách khó hiểu.
 */
function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** Tên cột chấp nhận được cho từng trường (không phân biệt hoa thường / dấu cách). */
const COLUMN_ALIASES: Record<string, string[]> = {
  bankRef: ['bank_ref', 'bankref', 'ma_gd', 'magd', 'so_tham_chieu', 'ref'],
  txnAt: ['txn_at', 'txnat', 'ngay_gd', 'ngaygd', 'ngay', 'date', 'datetime'],
  direction: ['direction', 'chieu', 'loai', 'type', 'dc'],
  amount: ['amount', 'so_tien', 'sotien', 'sotien_gd', 'value'],
  counterpartyAccount: [
    'counterparty_account',
    'tk_doi_ung',
    'so_tk_doi_ung',
    'account',
  ],
  counterpartyName: ['counterparty_name', 'ten_doi_ung', 'nguoi_nhan', 'name'],
  description: ['description', 'noi_dung', 'noidung', 'dien_giai', 'memo'],
};

/** Tách một dòng CSV, tôn trọng ngoặc kép và `""` là dấu nháy escape bên trong. */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field.trim());
  return out;
}

/**
 * Số tiền trong sao kê Việt Nam viết `1.500.000,00`, sao kê xuất từ hệ thống nước ngoài
 * viết `1,500,000.00`. Quy tắc: dấu phân cách xuất hiện SAU CÙNG mới là dấu thập phân, các
 * dấu còn lại là phân nhóm nghìn. Đoán sai chỗ này là lệch tiền 1000 lần, nên không đoán.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;

  const negative = cleaned.startsWith('-');
  const digits = cleaned.replace(/-/g, '');
  const lastDot = digits.lastIndexOf('.');
  const lastComma = digits.lastIndexOf(',');
  const decimalAt = Math.max(lastDot, lastComma);

  let normalized: string;
  if (decimalAt === -1) {
    normalized = digits;
  } else {
    const tail = digits.slice(decimalAt + 1);
    // Nhóm nghìn luôn đúng 3 chữ số; đuôi 3 chữ số là phân nhóm, không phải phần thập phân.
    normalized =
      tail.length === 3
        ? digits.replace(/[.,]/g, '')
        : `${digits.slice(0, decimalAt).replace(/[.,]/g, '')}.${tail}`;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * Ngày giờ giao dịch. Chấp nhận `dd/MM/yyyy`, `yyyy-MM-dd`, kèm `HH:mm[:ss]` tuỳ chọn.
 * Dựng bằng constructor số (không `new Date(string)`) để `01/02/2026` luôn là 1 tháng 2 —
 * `Date.parse` sẽ đọc thành 2 tháng 1 theo kiểu Mỹ.
 */
export function parseTxnAt(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;

  const isIso = /^\d{4}-/.test(t);
  const m = isIso
    ? /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
        t,
      )
    : /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
        t,
      );
  if (!m) return null;

  const day = Number(isIso ? m[3] : m[1]);
  const month = Number(m[2]);
  const year = Number(isIso ? m[1] : m[3]);
  const hour = Number(m[4] ?? 0);
  const minute = Number(m[5] ?? 0);
  const second = Number(m[6] ?? 0);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day, hour, minute, second);
  // Bắt ngày không tồn tại (31/02): JS tự trôi sang tháng sau thay vì báo lỗi.
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function parseDirection(
  raw: string | undefined,
  amount: number,
): BankStatementDirection | null {
  const t = (raw ?? '').trim().toLowerCase();
  if (!t) {
    // Không có cột chiều thì suy từ dấu của số tiền: âm = tiền ra.
    return amount < 0
      ? BankStatementDirection.DEBIT
      : BankStatementDirection.CREDIT;
  }
  if (['debit', 'd', 'ghi_no', 'ghi no', 'no', 'out', 'chi'].includes(t)) {
    return BankStatementDirection.DEBIT;
  }
  if (['credit', 'c', 'ghi_co', 'ghi co', 'co', 'in', 'thu'].includes(t)) {
    return BankStatementDirection.CREDIT;
  }
  return null;
}

export function parseBankStatementCsv(text: string): BankStatementParseResult {
  const rows: ParsedBankStatementRow[] = [];
  const errors: BankStatementParseError[] = [];

  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => l.trim().length > 0);
  if (headerIndex === -1) {
    return { rows, errors: [{ line: 0, message: 'File rỗng' }] };
  }

  // Sao kê xuất từ ngân hàng VN hay dùng dấu chấm phẩy vì dấu phẩy đã bận làm phân nhóm số.
  const headerLine = lines[headerIndex];
  const delimiter =
    headerLine.split(';').length > headerLine.split(',').length ? ';' : ',';

  const headers = splitCsvLine(headerLine, delimiter).map(normalizeHeader);
  const indexOf = (field: string): number => {
    const aliases = COLUMN_ALIASES[field];
    return headers.findIndex((h) => aliases.includes(h));
  };

  const col = {
    bankRef: indexOf('bankRef'),
    txnAt: indexOf('txnAt'),
    direction: indexOf('direction'),
    amount: indexOf('amount'),
    counterpartyAccount: indexOf('counterpartyAccount'),
    counterpartyName: indexOf('counterpartyName'),
    description: indexOf('description'),
  };

  const missing = (['bankRef', 'txnAt', 'amount'] as const).filter(
    (f) => col[f] === -1,
  );
  if (missing.length > 0) {
    return {
      rows,
      errors: [
        {
          line: headerIndex + 1,
          message: `Thiếu cột bắt buộc: ${missing.join(', ')}. Cần tối thiểu mã giao dịch, ngày giao dịch và số tiền.`,
        },
      ],
    };
  }

  const seenRefs = new Set<string>();

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;
    const lineNo = i + 1;
    const cells = splitCsvLine(rawLine, delimiter);
    const at = (idx: number): string => (idx === -1 ? '' : (cells[idx] ?? ''));

    const bankRef = at(col.bankRef).trim();
    if (!bankRef) {
      errors.push({ line: lineNo, message: 'Thiếu mã giao dịch' });
      continue;
    }
    // Trùng NGAY TRONG một file: unique index dưới DB sẽ bắt, nhưng báo tại dòng nào
    // thì chỉ chỗ này biết.
    if (seenRefs.has(bankRef)) {
      errors.push({
        line: lineNo,
        message: `Mã giao dịch ${bankRef} lặp lại trong file`,
      });
      continue;
    }

    const txnAt = parseTxnAt(at(col.txnAt));
    if (!txnAt) {
      errors.push({
        line: lineNo,
        message: `Ngày giao dịch không đọc được: "${at(col.txnAt)}"`,
      });
      continue;
    }

    const amount = parseAmount(at(col.amount));
    if (amount === null || amount === 0) {
      errors.push({
        line: lineNo,
        message: `Số tiền không hợp lệ: "${at(col.amount)}"`,
      });
      continue;
    }

    const direction = parseDirection(
      col.direction === -1 ? undefined : at(col.direction),
      amount,
    );
    if (!direction) {
      errors.push({
        line: lineNo,
        message: `Chiều tiền không đọc được: "${at(col.direction)}"`,
      });
      continue;
    }

    seenRefs.add(bankRef);
    rows.push({
      bankRef,
      txnAt,
      direction,
      amount: Math.abs(amount),
      counterpartyAccount: at(col.counterpartyAccount).trim() || null,
      counterpartyName: at(col.counterpartyName).trim() || null,
      description: at(col.description).trim() || null,
      rawLine,
    });
  }

  return { rows, errors };
}
