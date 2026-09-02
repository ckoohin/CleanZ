import { BankStatementDirection } from 'src/common/enums/bank-statement-entry.enum';
import {
  parseAmount,
  parseBankStatementCsv,
  parseTxnAt,
  splitCsvLine,
} from './bank-statement-csv';

describe('parseAmount — số tiền trong sao kê', () => {
  it('đọc định dạng Việt Nam (chấm phân nhóm nghìn)', () => {
    expect(parseAmount('1.500.000')).toBe(1_500_000);
  });

  it('đọc định dạng quốc tế (phẩy phân nhóm nghìn)', () => {
    expect(parseAmount('1,500,000')).toBe(1_500_000);
  });

  it('lấy dấu phân cách SAU CÙNG làm thập phân', () => {
    expect(parseAmount('1.500.000,50')).toBe(1_500_000.5);
    expect(parseAmount('1,500,000.50')).toBe(1_500_000.5);
  });

  it('đuôi đúng 3 chữ số là phân nhóm nghìn, không phải thập phân', () => {
    // Đây là chỗ đoán sai thì lệch tiền 1000 lần.
    expect(parseAmount('1.500')).toBe(1500);
    expect(parseAmount('1,500')).toBe(1500);
  });

  it('giữ dấu âm và bỏ ký hiệu tiền tệ', () => {
    expect(parseAmount('-1.500.000 đ')).toBe(-1_500_000);
    expect(parseAmount('VND 250.000')).toBe(250_000);
  });

  it('trả null cho ô rỗng hoặc không phải số', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('n/a')).toBeNull();
  });
});

describe('parseTxnAt — ngày giao dịch', () => {
  it('đọc dd/MM/yyyy theo kiểu Việt Nam, không phải kiểu Mỹ', () => {
    const d = parseTxnAt('01/02/2026');
    expect(d?.getDate()).toBe(1);
    expect(d?.getMonth()).toBe(1); // tháng 2
  });

  it('đọc yyyy-MM-dd kèm giờ', () => {
    const d = parseTxnAt('2026-02-01 14:30');
    expect(d?.getMonth()).toBe(1);
    expect(d?.getHours()).toBe(14);
    expect(d?.getMinutes()).toBe(30);
  });

  it('từ chối ngày không tồn tại thay vì để JS trôi sang tháng sau', () => {
    expect(parseTxnAt('31/02/2026')).toBeNull();
  });

  it('từ chối chuỗi không đúng định dạng', () => {
    expect(parseTxnAt('hôm qua')).toBeNull();
  });
});

describe('splitCsvLine', () => {
  it('tôn trọng ngoặc kép bọc dấu phân cách', () => {
    expect(splitCsvLine('a,"b,c",d', ',')).toEqual(['a', 'b,c', 'd']);
  });

  it('hiểu "" là một dấu nháy bên trong trường', () => {
    expect(splitCsvLine('a,"nói ""xin chào""",b', ',')).toEqual([
      'a',
      'nói "xin chào"',
      'b',
    ]);
  });
});

describe('parseBankStatementCsv', () => {
  const header =
    'bank_ref,txn_at,direction,amount,counterparty_account,counterparty_name,description';

  it('đọc file hợp lệ và chuẩn hoá số tiền về dương + chiều riêng', () => {
    const { rows, errors } = parseBankStatementCsv(
      [
        header,
        'FT001,01/02/2026,DEBIT,"1.500.000",0123456789,Nguyen Van A,CLEANZ BOI THUONG IC-1',
      ].join('\n'),
    );

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      bankRef: 'FT001',
      direction: BankStatementDirection.DEBIT,
      amount: 1_500_000,
      counterpartyName: 'Nguyen Van A',
      description: 'CLEANZ BOI THUONG IC-1',
    });
  });

  it('suy chiều tiền từ dấu khi sao kê không có cột chiều', () => {
    const { rows } = parseBankStatementCsv(
      ['bank_ref,txn_at,amount', 'FT002,01/02/2026,-500000'].join('\n'),
    );
    expect(rows[0].direction).toBe(BankStatementDirection.DEBIT);
    expect(rows[0].amount).toBe(500_000);
  });

  it('chấp nhận tên cột tiếng Việt và dấu chấm phẩy', () => {
    const { rows, errors } = parseBankStatementCsv(
      ['ma_gd;ngay_gd;so_tien;noi_dung', 'FT003;01/02/2026;-250.000;IC-9'].join(
        '\n',
      ),
    );
    expect(errors).toHaveLength(0);
    expect(rows[0]).toMatchObject({ bankRef: 'FT003', amount: 250_000 });
  });

  it('báo rõ thiếu cột bắt buộc thay vì nhập một file rỗng nghĩa', () => {
    const { rows, errors } = parseBankStatementCsv(
      ['ngay_gd,noi_dung', '01/02/2026,gì đó'].join('\n'),
    );
    expect(rows).toHaveLength(0);
    expect(errors[0].message).toMatch(/Thiếu cột bắt buộc/);
  });

  it('bỏ dòng hỏng nhưng vẫn nhận các dòng còn lại, kèm số dòng để sửa', () => {
    const { rows, errors } = parseBankStatementCsv(
      [
        header,
        'FT010,01/02/2026,DEBIT,100000,,,ok',
        'FT011,hôm qua,DEBIT,100000,,,ngày hỏng',
        'FT012,02/02/2026,DEBIT,không phải số,,,tiền hỏng',
        ',03/02/2026,DEBIT,100000,,,thiếu mã',
      ].join('\n'),
    );

    expect(rows).toHaveLength(1);
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5]);
  });

  it('bắt mã giao dịch lặp lại ngay trong một file', () => {
    const { rows, errors } = parseBankStatementCsv(
      [
        header,
        'FT020,01/02/2026,DEBIT,100000,,,lần 1',
        'FT020,01/02/2026,DEBIT,100000,,,lần 2',
      ].join('\n'),
    );
    expect(rows).toHaveLength(1);
    expect(errors[0].message).toMatch(/lặp lại/);
  });

  it('bỏ qua BOM của Excel ở tên cột đầu tiên', () => {
    const { rows, errors } = parseBankStatementCsv(
      ['﻿bank_ref,txn_at,amount', 'FT030,01/02/2026,-1000'].join('\n'),
    );
    expect(errors).toHaveLength(0);
    expect(rows[0].bankRef).toBe('FT030');
  });
});
