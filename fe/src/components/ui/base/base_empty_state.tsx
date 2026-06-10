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
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border bg-card/30 backdrop-blur-sm">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={24} aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm text-pretty mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
