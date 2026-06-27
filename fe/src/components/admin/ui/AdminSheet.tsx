"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface AdminSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "right" | "left" | "top" | "bottom";
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  /** Width utility for left/right sheets, e.g. "sm:max-w-xl". */
  widthClassName?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * Admin drawer — wraps shadcn Sheet and injects `cz-admin` into the portalled
 * content so `--c-*` tokens resolve inside the portal (see §6 risks).
 */
export function AdminSheet({
  open,
  onOpenChange,
  side = "right",
  title,
  description,
  footer,
  widthClassName = "sm:max-w-lg",
  className,
  bodyClassName,
  children,
}: AdminSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "cz-admin w-full border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] p-0 gap-0",
          (side === "left" || side === "right") && widthClassName,
          className
        )}
      >
        {(title || description) && (
          <SheetHeader className="border-b border-[var(--c-line)] p-5">
            {title && (
              <SheetTitle className="text-[16px] font-bold text-[var(--c-ink)]">
                {title}
              </SheetTitle>
            )}
            {description && (
              <SheetDescription className="text-[13px] text-[var(--c-muted)]">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        )}
        <div className={cn("cz-scroll flex-1 overflow-y-auto p-5", bodyClassName)}>
          {children}
        </div>
        {footer && (
          <SheetFooter className="border-t border-[var(--c-line)] p-4">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
