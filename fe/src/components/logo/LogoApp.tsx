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
  sm: { mark: 24, font: 15 },
  md: { mark: 34, font: 22 },
  lg: { mark: 44, font: 28 },
};

/* Mascot Logo (SVG Vector) */
function LogoMark({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={cn("shrink-0 text-primary drop-shadow-sm", className)}
    >
      {/* Antennas */}
      <path d="M50 32 L35 18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 32 L65 18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="33" cy="14" r="6" fill="currentColor" />
      <circle cx="67" cy="14" r="6" fill="currentColor" />
      
      {/* Ears */}
      <rect x="14" y="46" width="8" height="22" rx="4" fill="currentColor" />
      <rect x="78" y="46" width="8" height="22" rx="4" fill="currentColor" />
      
      {/* Helmet Outline */}
      <rect x="22" y="32" width="56" height="46" rx="23" stroke="currentColor" strokeWidth="5" fill="transparent" />
      
      {/* Eyes (Happy arcs) */}
      <path d="M38 52 Q 42 46 46 52" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M54 52 Q 58 46 62 52" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      
      {/* Cheeks */}
      <circle cx="34" cy="62" r="4" fill="#FF7EB3" />
      <circle cx="66" cy="62" r="4" fill="#FF7EB3" />
      
      {/* Mouth */}
      <path d="M44 60 Q 50 70 56 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
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
