// components/ui/LogoApp.tsx
import Link from "next/link";
import React from "react";

type LogoVariant = "default" | "pill" | "icon-only";
type LogoSize   = "sm" | "md" | "lg";

interface TLogoAppProps {
  href?:      string;
  className?: string;
  variant?:   LogoVariant;
  size?:      LogoSize;
  text?:      string;
}

const SIZE_MAP = {
  sm: { mark: 22, font: 14 },
  md: { mark: 30, font: 19 },
  lg: { mark: 40, font: 26 },
};

/* K lettermark — dùng --primary (indigo) */
function LogoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="7"
        className="fill-primary" />
      <text
        x="15" y="21.5"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="15"
        fontWeight="500"
        className="fill-primary-foreground"
        letterSpacing="0.04em"
      >
        K
      </text>
    </svg>
  );
}

export default function LogoApp({
  href      = "/",
  className = "",
  variant   = "default",
  size      = "md",
  text      = "KOS",
}: TLogoAppProps) {
  const s = SIZE_MAP[size];

  if (variant === "icon-only") {
    return (
      <Link href={href} className={`inline-flex select-none ${className}`}>
        <LogoMark size={s.mark + 6} />
      </Link>
    );
  }

  if (variant === "pill") {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-2 bg-accent border border-border rounded-full px-3 py-1.5 select-none hover:border-primary/30 transition-colors ${className}`}
      >
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
          <svg width="10" height="10" viewBox="0 0 30 30" fill="none">
            <text x="15" y="21" textAnchor="middle"
              fontFamily="'Playfair Display', serif"
              fontSize="15" fontWeight="500"
              fill="white">K</text>
          </svg>
        </div>
        <span
          className="text-[15px] font-medium tracking-[0.06em] text-foreground leading-none"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {text}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 select-none group ${className}`}
    >
      <LogoMark size={s.mark} />
      <span
        className="font-medium tracking-[0.08em] text-foreground leading-none"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: s.font,
        }}
      >
        {text}
        <span className="text-primary">.</span>
      </span>
    </Link>
  );
}