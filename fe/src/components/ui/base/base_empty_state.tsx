import React from "react";
import { LucideIcon, HelpCircle } from "lucide-react";

interface BaseEmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export default function BaseEmptyState({
  title,
  description,
  icon: Icon = HelpCircle,
  action,
}: BaseEmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-4 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
        <Icon size={24} aria-hidden="true" />
      </div>

      <h3 className="text-base font-bold tracking-tight text-[var(--c-ink)]">{title}</h3>

      {description && (
        <p className="mx-auto mt-1 max-w-sm text-pretty text-sm leading-relaxed text-[var(--c-muted)]">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
