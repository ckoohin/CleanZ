"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../utils";

type ButtonVariantType = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

interface BaseButtonProps extends React.ComponentProps<"button"> {
  isLoading?: boolean;
  variant?: ButtonVariantType | "glass" | "primary";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ className, children, isLoading = false, variant = "default", disabled, ...props }, ref) => {
    const isPrimary = variant === "primary";
    const isGlass = variant === "glass";

    const nativeVariant = (isPrimary || isGlass) ? "default" : (variant as ButtonVariantType);

    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative transition-all duration-200 active:scale-95",
          isPrimary && "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md active:scale-[0.98]",
          isGlass && "bg-card/60 backdrop-blur-sm border border-border/45 text-foreground hover:bg-card/85 active:scale-[0.98] shadow-sm",
          className
        )}
        variant={nativeVariant}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        )}
        <span className={cn("inline-flex items-center gap-1.5", isLoading && "opacity-90")}>
          {children}
        </span>
      </Button>
    );
  }
);

BaseButton.displayName = "BaseButton";
