import * as React from "react";
import { cn } from "@/lib/utils";

/** Semantic badge tones — fixed hex pairs that don't change with theme (design system §2). */
export type BadgeTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "purple"
  | "neutral";

export const TONE_META: Record<BadgeTone, { color: string; soft: string }> = {
  success: { color: "#0E9F6E", soft: "rgba(14,159,110,0.12)" },
  info: { color: "#2563EB", soft: "rgba(37,99,235,0.12)" },
  warning: { color: "#D97706", soft: "rgba(217,119,6,0.14)" },
  danger: { color: "#E11D48", soft: "rgba(225,29,72,0.12)" },
  purple: { color: "#7C3AED", soft: "rgba(124,58,237,0.12)" },
  neutral: { color: "var(--c-ink-soft)", soft: "var(--c-chip)" },
};

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Use a semantic tone… */
  tone?: BadgeTone;
  /** …or pass an explicit color/soft pair (overrides tone). */
  color?: string;
  soft?: string;
  /** Show a leading status dot. */
  dot?: boolean;
  label?: React.ReactNode;
}

/**
 * Pill badge — `color` + `background` from a semantic tone, with optional status dot.
 * Extracted from test/_components/CustomerManagement.tsx status cell.
 */
export function StatusBadge({
  tone = "neutral",
  color,
  soft,
  dot = false,
  label,
  children,
  className,
  ...props
}: StatusBadgeProps) {
  const meta = TONE_META[tone];
  const fg = color ?? meta.color;
  const bg = soft ?? meta.soft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap",
        className
      )}
      style={{ color: fg, background: bg }}
      {...props}
    >
      {dot && (
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: fg }} />
      )}
      {label ?? children}
    </span>
  );
}
