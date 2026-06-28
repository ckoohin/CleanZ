"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SIZE: Record<string, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export interface AdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZE;
  className?: string;
  /** Class for the scrollable body wrapper. */
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * Admin dialog — wraps shadcn Dialog and injects the `cz-admin` class onto the
 * portalled content so the `--c-*` design tokens resolve inside the portal
 * (Radix portals to document.body, outside the admin subtree). See §6 risks.
 */
export function AdminDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = "md",
  className,
  bodyClassName,
  children,
}: AdminDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "cz-admin border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] rounded-2xl p-0 gap-0 overflow-hidden",
          SIZE[size],
          className
        )}
      >
        {(title || description) && (
          <DialogHeader className="border-b border-[var(--c-line)] p-5 text-left">
            {title && (
              <DialogTitle className="text-[17px] font-bold text-[var(--c-ink)]">
                {title}
              </DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-[13px] text-[var(--c-muted)]">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        <div className={cn("cz-scroll max-h-[70vh] overflow-y-auto p-5", bodyClassName)}>
          {children}
        </div>
        {footer && (
          <DialogFooter className="border-t border-[var(--c-line)] p-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
