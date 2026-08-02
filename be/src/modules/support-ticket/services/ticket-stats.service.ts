import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';

export interface TicketStats {
  range: { from: Date; to: Date };
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  sla: {
    /** Số ticket vi phạm hạn XỬ LÝ / hạn PHẢN HỒI lần đầu. */
    resolutionBreached: number;
    firstResponseBreached: number;
    /** % ticket KHÔNG vi phạm (0–100, làm tròn 1 chữ số). */
    resolutionComplianceRate: number;
    firstResponseComplianceRate: number;
  };
  handling: {
    resolvedCount: number;
    /** Phút trung bình từ lúc tạo tới lúc phản hồi đầu / tới lúc giải quyết. */
    avgFirstResponseMins: number | null;
    avgResolutionMins: number | null;
  };
  csat: {
    /** Số phiếu đã MỜI đánh giá và số phiếu THỰC SỰ có điểm. */
    invited: number;
    responses: number;
    avgRating: number | null;
    distribution: Record<string, number>;
  };
}

interface RawAgg {
  total: string;
  res_breached: string;
  fr_breached: string;
  resolved: string;
  avg_fr: string | null;
  avg_res: string | null;
}

/**
 * Tổng hợp chỉ số vận hành cho module Support Ticket.
 *
 * Trước đây `ticket_surveys` chỉ có đường GHI (submit + csat-invite) mà không
 * endpoint nào đọc ra — dữ liệu hài lòng vào DB rồi nằm chết; tương tự không có
 * bất kỳ số liệu nào về tuân thủ SLA hay thời gian xử lý.
 *
 * Toàn bộ chạy bằng aggregate SQL (không nạp entity) và luôn giới hạn theo
 * khoảng thời gian để không quét cả bảng khi dữ liệu lớn dần.
 */
@Injectable()
export class TicketStatsService {
  constructor(private readonly dataSource: DataSource) {}

  private static pct(ok: number, total: number): number {
    if (total <= 0) return 100;
    return Math.round((ok / total) * 1000) / 10;
  }

  private static num(v: string | null): number | null {
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
  }

  private async groupCount(
    column: 'status' | 'category' | 'priority',
    from: Date,
    to: Date,
  ): Promise<Record<string, number>> {
    const rows: { k: string; c: string }[] = await this.dataSource.query(
      `SELECT ${column} AS k, COUNT(*)::int AS c
       FROM support_tickets
       WHERE created_at >= $1 AND created_at < $2
       GROUP BY ${column}`,
      [from, to],
    );
    const out: Record<string, number> = {};
    for (const r of rows) out[r.k] = Number(r.c);
    return out;
  }

  async getStats(from: Date, to: Date): Promise<TicketStats> {
    return asyncHandleOperation(async () => {
      const [byStatus, byCategory, byPriority, aggRows, csatRows] =
        await Promise.all([
          this.groupCount('status', from, to),
          this.groupCount('category', from, to),
          this.groupCount('priority', from, to),
          this.dataSource.query<RawAgg[]>(
            `SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE sla_breached)::int AS res_breached,
                    COUNT(*) FILTER (WHERE first_response_breached)::int AS fr_breached,
                    COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::int AS resolved,
                    AVG(EXTRACT(EPOCH FROM (first_responded_at - created_at)) / 60)
                      FILTER (WHERE first_responded_at IS NOT NULL) AS avg_fr,
                    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)
                      FILTER (WHERE resolved_at IS NOT NULL) AS avg_res
             FROM support_tickets
             WHERE created_at >= $1 AND created_at < $2`,
            [from, to],
          ),
          this.dataSource.query<
            { invited: string; responses: string; avg: string | null }[]
          >(
            `SELECT COUNT(*)::int AS invited,
                    COUNT(*) FILTER (WHERE s.rating IS NOT NULL)::int AS responses,
                    AVG(s.rating) AS avg
             FROM ticket_surveys s
             JOIN support_tickets t ON t.id = s.ticket_id
             WHERE t.created_at >= $1 AND t.created_at < $2`,
            [from, to],
          ),
        ]);

      const distRows: { rating: number; c: string }[] =
        await this.dataSource.query(
          `SELECT s.rating AS rating, COUNT(*)::int AS c
           FROM ticket_surveys s
           JOIN support_tickets t ON t.id = s.ticket_id
           WHERE t.created_at >= $1 AND t.created_at < $2 AND s.rating IS NOT NULL
           GROUP BY s.rating`,
          [from, to],
        );

      const agg = aggRows[0];
      const total = Number(agg?.total ?? 0);
      const resBreached = Number(agg?.res_breached ?? 0);
      const frBreached = Number(agg?.fr_breached ?? 0);

      const distribution: Record<string, number> = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
      };
      for (const r of distRows) distribution[String(r.rating)] = Number(r.c);

      const csat = csatRows[0];
      return {
        range: { from, to },
        total,
        byStatus,
        byCategory,
        byPriority,
        sla: {
          resolutionBreached: resBreached,
          firstResponseBreached: frBreached,
          resolutionComplianceRate: TicketStatsService.pct(
            total - resBreached,
            total,
          ),
          firstResponseComplianceRate: TicketStatsService.pct(
            total - frBreached,
            total,
          ),
        },
        handling: {
          resolvedCount: Number(agg?.resolved ?? 0),
          avgFirstResponseMins: TicketStatsService.num(agg?.avg_fr ?? null),
          avgResolutionMins: TicketStatsService.num(agg?.avg_res ?? null),
        },
        csat: {
          invited: Number(csat?.invited ?? 0),
          responses: Number(csat?.responses ?? 0),
          avgRating: TicketStatsService.num(csat?.avg ?? null),
          distribution,
        },
      };
    }, 'Lỗi khi lấy thống kê ticket');
  }
}
