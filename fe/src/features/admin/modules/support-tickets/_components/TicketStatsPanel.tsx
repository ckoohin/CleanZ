"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import { useTicketStats } from "../hooks/useSupportTicket";

/**
 * Dải chỉ số vận hành cho hàng đợi ticket.
 *
 * Hình thức chọn theo việc mà số liệu phải làm (không phải theo "cho đẹp"):
 *  - 4 con số đầu là headline rời rạc → KPI row bằng STAT TILE, không phải biểu đồ cột.
 *  - Tỉ lệ tuân thủ SLA là MỘT tỉ lệ so với ngưỡng → METER: thanh nền là bước
 *    nhạt hơn của CÙNG dải màu, nên trạng thái đọc được trên toàn thanh.
 *  - Phân bố CSAT là so sánh độ lớn trên thang có thứ tự → bar ngang MỘT hệ màu
 *    (sequential), không phải 5 màu khác nhau: 1★…5★ không phải 5 thực thể độc lập.
 *
 * Màu lấy từ biến của design system cz-admin nên tự đúng ở cả sáng lẫn tối.
 * Chữ luôn dùng token chữ, không bao giờ mặc màu dữ liệu.
 */

const GOOD = "#0E9F6E";
const DANGER = "#E11D48";
/** Ngưỡng coi là đạt cho tỉ lệ tuân thủ SLA. */
const SLA_TARGET = 90;

function fmtMins(mins: number | null): string {
  if (mins === null) return "—";
  if (mins < 60) return `${Math.round(mins)} phút`;
  const h = mins / 60;
  if (h < 24) return `${Math.round(h * 10) / 10} giờ`;
  return `${Math.round((h / 24) * 10) / 10} ngày`;
}

/** Stat tile: nhãn (sentence case) + giá trị + dòng phụ ngữ cảnh. */
function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
      <p className="text-[11px] font-semibold text-[var(--c-muted)]">{label}</p>
      {/* Số lớn dùng chữ số tỉ lệ (không tabular) — tabular chỉ dành cho cột số. */}
      <p
        className="mt-1 text-2xl font-semibold leading-none"
        style={{ color: accent ?? "var(--c-ink)" }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-[11px] text-[var(--c-muted)]">{hint}</p>
      )}
    </div>
  );
}

/**
 * Meter cho một tỉ lệ so với ngưỡng. Thanh nền là bước nhạt cùng dải màu.
 * Màu trạng thái LUÔN đi kèm icon + chữ, không bao giờ chỉ dựa vào màu.
 */
function SlaMeter({
  label,
  rate,
  breached,
}: {
  label: string;
  rate: number;
  breached: number;
}) {
  const ok = rate >= SLA_TARGET;
  const color = ok ? GOOD : DANGER;
  return (
    <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold text-[var(--c-muted)]">
          {label}
        </p>
        <span
          className="flex items-center gap-1 text-[11px] font-semibold"
          style={{ color }}
        >
          {ok ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <AlertTriangle className="size-3" />
          )}
          {ok ? "Đạt" : "Chưa đạt"}
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold leading-none text-[var(--c-ink)]">
        {rate}%
      </p>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--c-primary-soft)]"
        role="img"
        aria-label={`${label}: ${rate}% đạt, ${breached} ticket vi phạm`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, rate))}%`, background: color }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--c-muted)]">
        {breached} ticket vi phạm · mục tiêu {SLA_TARGET}%
      </p>
    </div>
  );
}

/**
 * Phân bố điểm CSAT — một chuỗi dữ liệu duy nhất nên KHÔNG cần chú giải,
 * tiêu đề đã nói rõ đang vẽ gì. Nhãn giá trị đặt ở đầu mút thanh.
 */
function CsatDistribution({
  distribution,
  responses,
}: {
  distribution: Record<string, number>;
  responses: number;
}) {
  const max = Math.max(1, ...Object.values(distribution));
  return (
    <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
      <p className="text-[11px] font-semibold text-[var(--c-muted)]">
        Phân bố đánh giá ({responses} phiếu)
      </p>
      {responses === 0 ? (
        <p className="mt-3 text-xs text-[var(--c-muted)]">
          Chưa có đánh giá nào trong kỳ.
        </p>
      ) : (
        // gap-y 6px = khe nền giữa các thanh liền kề (thanh cao 8px, cap < 24px)
        <div className="mt-2 flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[String(star)] ?? 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-[var(--c-muted)]">
                  {star}★
                </span>
                <div className="h-2 flex-1 rounded-full bg-[var(--c-primary-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--c-primary)]"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-[11px] tabular-nums text-[var(--c-ink-soft)]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const TicketStatsPanel: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useTicketStats();

  return (
    <section className="mb-4 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-bold text-[var(--c-ink)]">
          Chỉ số vận hành
          <span className="ml-2 text-xs font-normal text-[var(--c-muted)]">
            30 ngày gần nhất
          </span>
        </span>
        {open ? (
          <ChevronUp className="size-4 text-[var(--c-muted)]" />
        ) : (
          <ChevronDown className="size-4 text-[var(--c-muted)]" />
        )}
      </button>

      {open &&
        (isLoading || !data ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-[var(--c-card-2)]"
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Tổng ticket"
                value={data.total.toLocaleString("vi-VN")}
                hint={`${data.handling.resolvedCount} đã giải quyết`}
              />
              <StatTile
                label="Thời gian phản hồi đầu"
                value={fmtMins(data.handling.avgFirstResponseMins)}
                hint="trung bình từ lúc tạo"
              />
              <StatTile
                label="Thời gian xử lý"
                value={fmtMins(data.handling.avgResolutionMins)}
                hint="trung bình tới lúc giải quyết"
              />
              <StatTile
                label="Điểm hài lòng"
                value={
                  data.csat.avgRating !== null
                    ? `${data.csat.avgRating}/5`
                    : "—"
                }
                hint={`${data.csat.responses}/${data.csat.invited} phiếu đã chấm`}
                accent="var(--c-primary-strong)"
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <SlaMeter
                label="Tuân thủ hạn phản hồi"
                rate={data.sla.firstResponseComplianceRate}
                breached={data.sla.firstResponseBreached}
              />
              <SlaMeter
                label="Tuân thủ hạn xử lý"
                rate={data.sla.resolutionComplianceRate}
                breached={data.sla.resolutionBreached}
              />
              <CsatDistribution
                distribution={data.csat.distribution}
                responses={data.csat.responses}
              />
            </div>

            <p className="flex items-center gap-1.5 text-[11px] text-[var(--c-muted)]">
              <Star className="size-3" />
              Số liệu tính trên ticket được tạo trong kỳ.
            </p>
          </div>
        ))}
    </section>
  );
};
