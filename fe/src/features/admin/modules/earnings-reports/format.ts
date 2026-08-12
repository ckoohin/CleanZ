import { formatVnd } from "@/lib/format";

/**
 * API legacy snapshots may still serialize PostgreSQL `numeric(12,2)` as a
 * string. Earnings are VND, so the admin UI always displays a whole đồng.
 */
export function formatEarningsReportVnd(
  value: number | string | null | undefined,
): string {
  const amount = Number(value);
  return formatVnd(Number.isFinite(amount) ? Math.round(amount) : 0);
}
