import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned actions (buttons). */
  actions?: React.ReactNode;
  className?: string;
}

/** Page title block — H1 + muted description + right-aligned actions (design system §3). */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-sans text-[24px] font-bold leading-tight tracking-tight text-[var(--c-ink)]">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-[13px] text-[var(--c-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
