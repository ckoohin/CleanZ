import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminCard } from "./AdminCard";

export interface CardHeadProps {
  title: React.ReactNode;
  /** Small muted hint under the title. */
  hint?: React.ReactNode;
  /** Uppercase eyebrow above the title. */
  eyebrow?: React.ReactNode;
  /** Right-aligned action slot. */
  action?: React.ReactNode;
  className?: string;
}

/** Card header: optional eyebrow + title + hint, with a right-aligned action slot. */
export function CardHead({ title, hint, eyebrow, action, className }: CardHeadProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">
            {eyebrow}
          </div>
        )}
        <h3 className="text-[15px] font-bold text-[var(--c-ink)]">{title}</h3>
        {hint && <p className="mt-0.5 text-[12.5px] text-[var(--c-muted)]">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export interface SectionCardProps extends CardHeadProps {
  children: React.ReactNode;
  /** Padding around the body (default p-5). */
  bodyClassName?: string;
  cardClassName?: string;
}

/** A card with a standard header + body — the workhorse for detail panels / widgets. */
export function SectionCard({
  title,
  hint,
  eyebrow,
  action,
  children,
  className,
  bodyClassName,
  cardClassName,
}: SectionCardProps) {
  return (
    <AdminCard className={cn("p-5", cardClassName)}>
      <CardHead
        title={title}
        hint={hint}
        eyebrow={eyebrow}
        action={action}
        className={className}
      />
      <div className={bodyClassName}>{children}</div>
    </AdminCard>
  );
}
