import * as React from "react";
import { Hammer, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Dashed border framed variant (default true). */
  framed?: boolean;
  className?: string;
}

/** Empty / placeholder state — icon chip + title + description + optional CTA. */
export function EmptyState({
  icon: Icon = Hammer,
  title,
  description,
  action,
  framed = true,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        framed && "rounded-2xl border border-dashed",
        className
      )}
      style={framed ? { borderColor: "var(--c-line-strong)" } : undefined}
    >
      <div
        className="grid size-14 place-items-center rounded-2xl"
        style={{ background: "var(--c-primary-soft)", color: "var(--c-primary-strong)" }}
      >
        <Icon className="size-6" />
      </div>
      <h2 className="mt-4 font-sans text-[18px] font-bold tracking-tight text-[var(--c-ink)]">
        {title}
      </h2>
      {description && (
        <p className="mt-1 max-w-md text-[13px] text-[var(--c-muted)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Convenience "coming soon" placeholder (design system reference). */
export function ComingSoon({ title }: { title: string }) {
  return (
    <EmptyState
      title={title}
      description="Màn hình đang được xây dựng."
    />
  );
}
