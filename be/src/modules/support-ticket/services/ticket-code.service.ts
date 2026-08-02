import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SupportTicketEntity } from '../entity/support-ticket.entity';

@Injectable()
export class TicketCodeService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
  ) {}

  /**
   * Sinh mã `TK-YYYYMMDD-NNNN` bằng BỘ ĐẾM NGUYÊN TỬ theo ngày.
   *
   * `INSERT ... ON CONFLICT (day) DO UPDATE SET seq = seq + 1 RETURNING seq`
   * khoá đúng 1 dòng và trả về số đã tăng — hai request đồng thời nhận hai số
   * khác nhau vì Postgres tuần tự hoá thao tác ghi trên cùng một dòng.
   *
   * Thay cho cách cũ `MAX(seq) + 1`, vốn có hai lỗi:
   *  - quét toàn bảng `support_tickets` (cột `ticket_code` không có index),
   *  - đọc-rồi-ghi KHÔNG nguyên tử ⇒ trùng mã khi tạo ticket đồng thời.
   *
   * Gọi NGOÀI transaction tạo ticket là có chủ ý: bộ đếm commit ngay và nhả
   * khoá tức thì, thay vì giữ khoá suốt giao dịch (nếu giữ, mọi lượt tạo ticket
   * trong cùng ngày sẽ phải xếp hàng nối đuôi nhau). Đổi lại, giao dịch thất
   * bại sẽ bỏ trống một số — mã ticket cam kết DUY NHẤT, không cam kết liên tục.
   */
  async next(now: Date = new Date(), manager?: EntityManager): Promise<string> {
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, '0');
    const d = `${now.getDate()}`.padStart(2, '0');

    const runner = manager ?? this.ticketRepo.manager;
    const rows = await runner.query<{ seq: number }[]>(
      `INSERT INTO ticket_code_counters (day, seq)
       VALUES ($1::date, 1)
       ON CONFLICT (day) DO UPDATE SET seq = ticket_code_counters.seq + 1
       RETURNING seq`,
      [`${y}-${m}-${d}`],
    );

    const seq = `${Number(rows[0]?.seq ?? 1)}`.padStart(4, '0');
    return `TK-${y}${m}${d}-${seq}`;
  }
}
