import * as React from "react";
import { cn } from "@/lib/utils";
import { AMBER_GRADIENT } from "./AdminAvatar";

export type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type AdminButtonSize = "sm" | "md";

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  /** Optional leading icon element (e.g. <Plus className="size-4" />). */
  icon?: React.ReactNode;
}

const SIZE: Record<AdminButtonSize, string> = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-9 px-3.5 text-[12.5px]",
};

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40";

/**
 * Admin button (design system §7).
 *  - primary: amber gradient, lifts on hover
 *  - secondary: bordered card surface
 *  - ghost: borderless, hover tint
 *  - danger: red text/tint
 */
export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  function AdminButton(
    { variant = "secondary", size = "md", icon, className, children, style, ...props },
    ref
  ) {
    const base = cn(
      "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
      SIZE[size],
      FOCUS
    );

    if (variant === "primary") {
      return (
        <button
          ref={ref}
          className={cn(
            base,
            "text-white shadow-[0_8px_18px_-8px_rgba(255,152,0,0.7)] transition-transform hover:-translate-y-0.5",
            className
          )}
          style={{ background: AMBER_GRADIENT, ...style }}
          {...props}
        >
          {icon}
          {children}
        </button>
      );
    }

    if (variant === "danger") {
      return (
        <button
          ref={ref}
          className={cn(base, "text-[#E11D48] hover:bg-[#E11D48]/10", className)}
          style={style}
          {...props}
        >
          {icon}
          {children}
        </button>
      );
    }

    if (variant === "ghost") {
      return (
        <button
          ref={ref}
          className={cn(
            base,
            "text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]",
            className
          )}
          style={style}
          {...props}
        >
          {icon}
          {children}
        </button>
      );
    }

    // secondary
    return (
      <button
        ref={ref}
        className={cn(
          base,
          "border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]",
          className
        )}
        style={style}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  }
);
