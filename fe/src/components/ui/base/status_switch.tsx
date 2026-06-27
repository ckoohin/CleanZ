"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel: string;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

/**
 * Shared presentational status switch (the modern amber/primary track with a
 * white thumb + Check icon when ON, muted bordered track when OFF). Pure UI —
 * no business logic, confirm dialog, or mutation. Callers own the onClick.
 */
export const StatusSwitch: React.FC<StatusSwitchProps> = ({
  checked,
  disabled = false,
  onClick,
  ariaLabel,
  activeLabel,
  inactiveLabel,
  className,
}) => {
  const hasLabel = activeLabel !== undefined || inactiveLabel !== undefined;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 cursor-pointer select-none rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200",
          checked ? "bg-primary border-transparent" : "bg-muted border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-transform duration-200",
            checked
              ? "translate-x-[22px] bg-white"
              : "translate-x-0.5 bg-zinc-400 dark:bg-zinc-500"
          )}
        >
          {checked && <Check className="h-3 w-3 text-primary" strokeWidth={3} />}
        </span>
      </span>
      {hasLabel && (
        <span
          aria-hidden="true"
          className={cn(
            "text-xs font-semibold",
            checked ? "text-primary" : "text-muted-foreground"
          )}
        >
          {checked ? activeLabel : inactiveLabel}
        </span>
      )}
    </button>
  );
};
