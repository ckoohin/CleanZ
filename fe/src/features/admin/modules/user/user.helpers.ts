/**
 * Date formatters shared across the admin-user components.
 *
 * Two intentionally distinct helpers — they render different formats/fallbacks
 * and must keep their exact output, so they are NOT collapsed into one:
 *  - `formatUserDateTime`: long date + time, used in the detail drawer.
 *  - `formatUserDate`: short date, used in the list table.
 */

/** Long Vietnamese date + time (e.g. "27 tháng 6, 2026, 14:05"); empty → "Chưa có". */
export const formatUserDateTime = (value?: string | null): string => {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Short Vietnamese date (e.g. "27/6/2026"); empty → "N/A". */
export const formatUserDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "N/A";
