"use client";
import { BadgeCheck, ShieldCheck, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TRUST_BADGES = [
  { icon: BadgeCheck, label: "Verified Pros" },
  { icon: ShieldCheck, label: "Insured Work" },
  { icon: Clock, label: "24/7 Support" },
];

export default function HeroSection() {
  return (
    <section className="relative px-6 pt-24 pb-36 overflow-hidden bg-background">
      {/* Grain texture */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient blobs — indigo tones matching --primary */}
      <div className="pointer-events-none absolute -top-36 -right-24 w-[520px] h-[520px] rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(99,102,241,0.09)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-[380px] h-[380px] rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(129,140,248,0.07)_0%,transparent_70%)]" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">

        {/* Badge — dùng accent colors từ theme */}
        <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground border border-primary/20 text-[11px] font-medium tracking-[0.1em] uppercase px-3.5 py-1.5 rounded-full mb-9">
          <span className="w-[5px] h-[5px] rounded-full bg-primary animate-pulse" />
          1,200+ verified professionals
        </div>

        {/* Headline */}
        <h1
          className="text-[clamp(52px,8.5vw,84px)] font-light leading-[1.06] tracking-[-0.02em] text-foreground mb-6"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Every service,{" "}
          <em
            className="not-italic italic font-normal text-primary relative
              after:absolute after:bottom-[2px] after:inset-x-0 after:h-px
              after:bg-gradient-to-r after:from-transparent after:via-primary/50 after:to-transparent"
          >
            precisely
          </em>{" "}
          handled.
        </h1>

        {/* Subtext */}
        <p
          className="text-[15px] leading-[1.75] font-light text-muted-foreground max-w-[460px] mx-auto mb-11"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Curated professionals, transparent pricing, and effortless scheduling — all in one place.
        </p>

        {/* Search bar — shadcn Input + Button */}
        <div className="max-w-[580px] mx-auto mb-12">
          <div
            className="flex items-center gap-2.5 bg-card border border-border rounded-[calc(var(--radius)+4px)] p-[5px] pl-4
              shadow-sm transition-all duration-200
              focus-within:border-ring focus-within:shadow-[0_0_0_3px_hsl(var(--ring)/0.1)]"
          >
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent border-none outline-none text-sm font-light text-foreground placeholder:text-muted-foreground"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              placeholder="Find a service (e.g. Deep Cleaning, Math Tutor)"
            />
            <Button size="sm" className="rounded-[var(--radius)] px-5 h-9 text-[13px]">
              Search
            </Button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="border-t border-border pt-5 max-w-[500px] mx-auto">
          <div className="flex flex-wrap justify-center">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="relative flex items-center gap-1.5 text-[12.5px] text-muted-foreground px-5 py-2
                  [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:left-0
                  [&:not(:first-child)]:before:top-1/2 [&:not(:first-child)]:before:-translate-y-1/2
                  [&:not(:first-child)]:before:h-3.5 [&:not(:first-child)]:before:w-px
                  [&:not(:first-child)]:before:bg-border"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <Icon className="w-[14px] h-[14px] text-primary shrink-0" strokeWidth={1.7} />
                {label}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}