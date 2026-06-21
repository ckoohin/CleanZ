import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";
import Image from "next/image";

type LogoVariant = "default" | "pill" | "icon-only";
type LogoSize   = "sm" | "md" | "lg";

interface TLogoAppProps {
  href?:           string;
  className?:      string;
  markClassName?:  string;
  textClassName?:  string;
  variant?:        LogoVariant;
  size?:           LogoSize;
  text?:           string;
}

const SIZE_MAP = {
  sm: { mark: 28, font: 18 },
  md: { mark: 40, font: 26 },
  lg: { mark: 52, font: 34 },
};

/* Mascot Logo (SVG Vector) */
function LogoMark({ size, className }: { size: number; className?: string }) {
  return (
    <Image 
      src="/mascot.svg"
      alt="CleanZ Mascot"
      width={size}
      height={size}
      className={cn("shrink-0 drop-shadow-sm", className)}
      priority
    />
  );
}

export default function LogoApp({
  href          = "/",
  className     = "",
  markClassName = "",
  textClassName = "",
  variant       = "default",
  size          = "md",
  text          = "CleanZ",
}: TLogoAppProps) {
  const s = SIZE_MAP[size];

  if (variant === "icon-only") {
    return (
      <Link href={href} className={cn("inline-flex select-none", className)}>
        <LogoMark size={s.mark + 6} className={markClassName} />
      </Link>
    );
  }

  if (variant === "pill") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 bg-accent border border-border rounded-full px-3 py-1.5 select-none hover:border-primary/30 transition-colors",
          className
        )}
      >
        <LogoMark size={35} className={markClassName} />
        <span
          className={cn("text-[16px] font-bold tracking-tight leading-none", textClassName)}
        >
          {text === "CleanZ" ? (
            <>
              Clean<span className="text-primary">Z</span>
            </>
          ) : (
            text
          )}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-0.5 select-none group", className)}
    >
      <LogoMark size={s.mark} className={markClassName} />
      <span
        className={cn("font-black tracking-tight leading-none translate-y-[2px]", textClassName)}
        style={{
          fontSize: s.font,
        }}
      >
        {text === "CleanZ" ? (
          <>
            Clean<span className="text-primary">Z</span>
          </>
        ) : (
          text
        )}
        <span className="text-primary font-black">.</span>
      </span>
    </Link>
  );
}
