import { AuditActionCode } from './audit-action-codes';
import { AUDIT_ACTION_LABELS } from './audit-action-labels';

/**
 * Mã hành động là KHOÁ TRA CỨU của nhật ký kiểm toán, nên hai nghiệp vụ khác nhau
 * mang cùng một mã là hỏng ở mức không sửa được về sau: các bản ghi đã ghi rồi
 * không còn cách nào tách ra. Với vài chục mã được thêm bằng copy-paste, trùng là
 * chuyện sớm muộn — và không có gì trong TypeScript bắt được, vì trùng GIÁ TRỊ
 * giữa hai khoá khác nhau vẫn hợp lệ.
 */
describe('AuditActionCode', () => {
  const entries = Object.entries(AuditActionCode);

  it('không có hai khoá nào dùng chung một mã', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const [key, code] of entries) {
      const owner = seen.get(code);
      if (owner) {
        duplicates.push(`${code} dùng bởi cả ${owner} và ${key}`);
      } else {
        seen.set(code, key);
      }
    }

    expect(duplicates).toEqual([]);
  });

  /**
   * `MIỀN.HÀNH_ĐỘNG`, chữ hoa không dấu. Quy ước này là thứ cho phép lọc theo
   * miền (`FINANCE.%`) khi dựng báo cáo — lệch định dạng thì bản ghi đó rơi ra
   * ngoài mọi bộ lọc mà không báo lỗi.
   */
  it('mọi mã đều theo quy ước MIỀN.HÀNH_ĐỘNG', () => {
    const invalid = entries
      .filter(([, code]) => !/^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$/.test(code))
      .map(([key, code]) => `${key}=${code}`);

    expect(invalid).toEqual([]);
  });

  // Cột `action_code` là varchar(80); mã dài hơn sẽ bị cắt hoặc ném lỗi khi ghi.
  it('không mã nào vượt giới hạn cột', () => {
    const tooLong = entries
      .filter(([, code]) => code.length > 80)
      .map(([key]) => key);

    expect(tooLong).toEqual([]);
  });

  /**
   * Thiếu nhãn không làm hỏng gì — interceptor lặng lẽ rơi về cách đoán cũ từ tên
   * hàm. Đó chính là vấn đề: hành động mới sẽ hiện một nhãn sai nghĩa trên giao
   * diện mà không ai biết là nó đang đoán. Test này bắt lúc thêm mã, không phải
   * lúc ai đó nhìn thấy nhãn lạ trong nhật ký.
   */
  it('mọi mã đều có nhãn tiếng Việt', () => {
    const missing = entries
      .filter(([, code]) => !AUDIT_ACTION_LABELS[code])
      .map(([key]) => key);

    expect(missing).toEqual([]);
  });

  // Cột `action` là varchar(120).
  it('không nhãn nào vượt giới hạn cột', () => {
    const tooLong = Object.entries(AUDIT_ACTION_LABELS)
      .filter(([, label]) => label.length > 120)
      .map(([code]) => code);

    expect(tooLong).toEqual([]);
  });

  it('không có nhãn mồ côi trỏ tới mã đã xoá', () => {
    const known = new Set<string>(entries.map(([, code]) => code));
    const orphans = Object.keys(AUDIT_ACTION_LABELS).filter(
      (code) => !known.has(code),
    );

    expect(orphans).toEqual([]);
  });
});
