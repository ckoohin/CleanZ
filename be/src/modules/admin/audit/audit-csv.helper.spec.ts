import { buildCsv } from './audit-csv.helper';

describe('buildCsv', () => {
  it('bọc mọi ô trong nháy kép và phân tách bằng CRLF', () => {
    const csv = buildCsv(['a', 'b'], [['1', '2']]);

    expect(csv.endsWith('"a","b"\r\n"1","2"')).toBe(true);
  });

  /**
   * Không có BOM, Excel trên Windows đọc file bằng bảng mã ANSI và toàn bộ tiếng
   * Việt thành ký tự rác. Người nhận file điều tra gần như luôn mở bằng Excel.
   */
  it('mở đầu bằng BOM UTF-8', () => {
    expect(buildCsv(['Thời điểm'], []).charCodeAt(0)).toBe(0xfeff);
  });

  it('nhân đôi nháy kép bên trong ô', () => {
    const csv = buildCsv(['x'], [['Admin nói "được"']]);

    expect(csv).toContain('"Admin nói ""được"""');
  });

  it('giữ nguyên dấu phẩy và xuống dòng trong ô', () => {
    const csv = buildCsv(['x'], [['dòng 1\ndòng 2, còn nữa']]);

    expect(csv).toContain('"dòng 1\ndòng 2, còn nữa"');
  });

  /**
   * Nhật ký chứa dữ liệu do người dùng nhập (lý do, ghi chú), nên nội dung ô là
   * thứ kẻ tấn công điều khiển được. Một ô bắt đầu bằng `=` sẽ được Excel diễn
   * giải như công thức khi mở file — đây là CSV injection, và đích ngắm chính là
   * người đang điều tra sự cố.
   */
  it.each(['=1+1', '+1', '-1', '@SUM(A1)'])(
    'vô hiệu hoá công thức Excel: %s',
    (payload) => {
      const csv = buildCsv(['x'], [[payload]]);

      expect(csv).toContain(`"'${payload}"`);
    },
  );

  it('ghi ô rỗng cho null và undefined', () => {
    const csv = buildCsv(['a', 'b'], [[null, undefined]]);

    expect(csv).toContain('"",""');
  });

  it('tuần tự hoá object thành JSON', () => {
    const csv = buildCsv(['x'], [[{ amount: 1000 }]]);

    expect(csv).toContain('"{""amount"":1000}"');
  });

  it('ghi Date theo ISO để không lệ thuộc locale máy đọc', () => {
    const csv = buildCsv(['x'], [[new Date('2026-08-09T03:00:00.000Z')]]);

    expect(csv).toContain('"2026-08-09T03:00:00.000Z"');
  });
});
