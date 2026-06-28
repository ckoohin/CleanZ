// Shared formatting helpers (VN locale). Used across the admin design-system kit.

/** Format a number as Vietnamese đồng, e.g. 61250000 → "61.250.000₫". */
export function formatVnd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0₫";
  return n.toLocaleString("vi-VN") + "₫";
}

/** Compact money for tight spaces, e.g. 1_240_000_000 → "1,2 tỷ", 184_600_000 → "184,6tr". */
export function formatVndCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0₫";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".0", "").replace(".", ",")} tỷ`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "").replace(".", ",")}tr`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n.toLocaleString("vi-VN")}₫`;
}

/** Plain VN-grouped integer, e.g. 2847 → "2.847". */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0";
  return n.toLocaleString("vi-VN");
}

/** Two-letter uppercase initials from a name, e.g. "Nguyễn Thu Hà" → "NH". */
export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
