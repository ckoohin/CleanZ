import * as React from "react";
import { cn } from "@/lib/utils";

/** Standard admin input surface (design system §9). Apply to <input>/<select>/<textarea>. */
export const adminInputClass = cn(
  "h-10 w-full rounded-xl border bg-[var(--c-card-2)] px-3 text-[13.5px] text-[var(--c-ink)] outline-none transition-colors",
  "border-[var(--c-line-strong)] placeholder:text-[var(--c-muted)]",
  "focus:border-[var(--c-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/30"
);

export interface FormShellProps {
  children: React.ReactNode;
  /** Max form width in px (design system §9: 640–800). Default 760. */
  maxW?: number;
  className?: string;
}

/** Width-limited form container — full-width pages still keep forms readable (§9). */
export function FormShell({ children, maxW = 760, className }: FormShellProps) {
  return (
    <div className={cn("w-full", className)} style={{ maxWidth: maxW }}>
      {children}
    </div>
  );
}

export interface FormFieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/** Labelled form row — label + required marker + hint + control + error. */
export function FormField({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--c-ink-soft)]"
        >
          {label}
          {required && <span className="text-[#E11D48]">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[11.5px] text-[var(--c-muted)]">{hint}</p>
      )}
      {error && <p className="text-[11.5px] font-medium text-[#E11D48]">{error}</p>}
    </div>
  );
}
