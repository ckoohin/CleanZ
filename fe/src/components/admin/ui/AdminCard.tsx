import * as React from "react";
import { cn } from "@/lib/utils";

/** The standard admin card shadow (design system §7). */
export const CARD_SHADOW =
  "shadow-[0_1px_2px_rgba(15,27,51,0.04),0_8px_24px_-14px_rgba(15,27,51,0.10)]";

/** Canonical admin card surface — reuse this class anywhere a card surface is needed. */
export const adminCardClass = cn(
  "rounded-2xl border bg-[var(--c-card)] border-[var(--c-line)]",
  CARD_SHADOW
);

export const AdminCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function AdminCard({ className, ...props }, ref) {
  return <div ref={ref} className={cn(adminCardClass, className)} {...props} />;
});
