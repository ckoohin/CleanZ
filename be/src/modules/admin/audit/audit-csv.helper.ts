/**
 * Sinh CSV cho việc điều tra nội bộ.
 *
 * Tự viết thay vì thêm thư viện: định dạng chỉ có ba quy tắc (bọc nháy kép, nhân
 * đôi nháy bên trong, giữ nguyên xuống dòng trong ô), và một dependency mới cho
 * ngần ấy là không xứng.
 */

/**
 * BOM UTF-8. Không có nó, Excel trên Windows đọc file bằng bảng mã ANSI của hệ
 * thống và toàn bộ tiếng Việt thành ký tự rác. Người nhận file điều tra gần như
 * luôn mở bằng Excel, nên đây không phải chi tiết làm cho đẹp.
 *
 * Viết dạng escape thay vì ký tự thật: BOM là ký tự vô hình, dán thẳng vào mã
 * nguồn thì lần sửa file sau không ai biết nó có ở đó.
 */
const UTF8_BOM = '\ufeff';

/**
 * Ký tự khiến Excel diễn giải ô như công thức. Một giá trị bắt đầu bằng `=` có
 * thể trở thành lệnh khi mở file — và nhật ký thì chứa dữ liệu do người dùng
 * nhập, tức là kẻ tấn công điều khiển được nội dung ô. Thêm dấu nháy đơn phía
 * trước để Excel coi đó là văn bản.
 */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '""';

  let text: string;
  if (value instanceof Date) {
    text = value.toISOString();
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else if (typeof value === 'string') {
    text = value;
  } else {
    // Chỉ còn number/boolean/bigint/symbol — ép kiểu tường minh để không vô tình
    // in ra `[object Object]` nếu về sau có nhánh nào lọt xuống đây.
    text = String(value as number | boolean | bigint);
  }

  if (FORMULA_TRIGGERS.some((trigger) => text.startsWith(trigger))) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];
  // CRLF: quy ước của RFC 4180 và là thứ Excel xử lý ổn định nhất.
  return UTF8_BOM + lines.join('\r\n');
}
