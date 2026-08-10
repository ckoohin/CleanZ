"use client";

import { AlertTriangle, Database } from "lucide-react";
import { useAuditStorageMetrics } from "../hooks/useAdminActivities";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Số liệu đủ tin cậy để đọc `averageBytesPerLog`. Dưới ngưỡng này, chi phí cố
 * định của index và trang trống át kích thước dữ liệu thật, cho ra con số vài
 * nghìn byte mỗi dòng và dễ khiến người đọc hoảng vô cớ.
 */
const RELIABLE_SAMPLE_SIZE = 1_000;

/**
 * Mốc quan sát, KHÔNG phải ngưỡng cứng. Dưới 10k/ngày thì bảng thường là đủ;
 * vượt 100k/ngày mới đáng bàn tới partition.
 */
const WATCH_THRESHOLD_PER_DAY = 10_000;

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--c-muted)]">{label}</p>
      <p className="text-[15px] font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-[var(--c-muted)]">{hint}</p>}
    </div>
  );
}

/**
 * Mức tiêu thụ lưu trữ của nhật ký và tồn đọng hàng đợi.
 *
 * Có mặt ở đây để quyết định kiến trúc lưu trữ dựa trên số đo thật thay vì phỏng
 * đoán: ngưỡng cần partition phụ thuộc lượng ghi thực tế, mà lượng đó chỉ biết
 * được sau vài tuần chạy.
 */
export function AuditStoragePanel() {
  const { data, isLoading } = useAuditStorageMetrics();

  if (isLoading || !data) return null;

  const sampleTooSmall = data.totalLogs < RELIABLE_SAMPLE_SIZE;
  const outboxStuck = data.outboxFailed > 0 || data.outboxPending > 100;

  return (
    <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Database className="size-4 text-[var(--c-muted)]" />
        <p className="text-sm font-medium">Lưu trữ nhật ký</p>
        <span className="text-[11px] text-[var(--c-muted)]">
          giữ 12 tháng, tự dọn phần quá hạn
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Metric
          label="Tổng bản ghi"
          value={data.totalLogs.toLocaleString("vi-VN")}
          hint={
            data.oldestLogAt
              ? `từ ${new Date(data.oldestLogAt).toLocaleDateString("vi-VN")}`
              : undefined
          }
        />
        <Metric
          label="24 giờ qua"
          value={data.logsLast24h.toLocaleString("vi-VN")}
        />
        <Metric
          label="Trung bình mỗi ngày"
          value={data.logsPerDayLast30d.toLocaleString("vi-VN")}
          hint={
            data.logsPerDayLast30d >= WATCH_THRESHOLD_PER_DAY
              ? "vượt mốc theo dõi"
              : "30 ngày gần nhất"
          }
        />
        <Metric
          label="Dung lượng bảng"
          value={formatBytes(data.tableSizeBytes)}
          hint={
            sampleTooSmall
              ? "mẫu còn nhỏ"
              : `~${formatBytes(data.averageBytesPerLog)}/bản ghi`
          }
        />
        <Metric
          label="Hàng đợi ghi"
          value={`${data.outboxPending} chờ / ${data.outboxFailed} lỗi`}
        />
      </div>

      {/* Hàng đợi dâng lên nghĩa là nhật ký đang trễ so với thao tác thật — chỉ
          báo sớm nhất cho việc worker không theo kịp hoặc đã chết. */}
      {outboxStuck && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-amber-600">
          <AlertTriangle className="size-3.5" />
          Hàng đợi ghi nhật ký đang tồn đọng — một số thao tác có thể chưa được
          ghi lại.
        </p>
      )}
    </div>
  );
}
