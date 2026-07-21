import { cn } from "@/lib/utils";

interface ServiceCardSkeletonProps {
  className?: string;
}

const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative overflow-hidden bg-muted rounded-lg",
      "after:absolute after:inset-0 after:translate-x-[-100%]",
      "after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent",
      "after:animate-[shimmer_1.5s_infinite]",
      className
    )}
  />
);

export const ServiceCardSkeleton = ({ className }: ServiceCardSkeletonProps) => {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border/40 overflow-hidden flex flex-col",
        className
      )}
    >
      {/* Image skeleton — 16:10 ratio */}
      <Shimmer className="aspect-[16/10] w-full rounded-none" />

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Title + shield */}
        <div className="flex items-start justify-between gap-2">
          <Shimmer className="h-5 w-3/4 rounded-md" />
          <Shimmer className="h-4 w-4 rounded-md shrink-0" />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Shimmer className="h-3.5 w-full rounded-md" />
          <Shimmer className="h-3.5 w-5/6 rounded-md" />
        </div>

        {/* Sub-service tags */}
        <div className="flex gap-1.5">
          <Shimmer className="h-5 w-16 rounded-full" />
          <Shimmer className="h-5 w-20 rounded-full" />
          <Shimmer className="h-5 w-14 rounded-full" />
        </div>

        {/* Duration + Area */}
        <div className="flex items-center gap-3">
          <Shimmer className="h-4 w-16 rounded-md" />
          <Shimmer className="h-3 w-px" />
          <Shimmer className="h-4 w-24 rounded-md" />
        </div>

        {/* Divider */}
        <div className="h-px bg-border/40" />

        {/* Price + 2 CTA buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <Shimmer className="h-2.5 w-8 rounded-md" />
            <Shimmer className="h-5 w-24 rounded-md" />
          </div>
          <div className="flex gap-2 shrink-0">
            <Shimmer className="h-8 w-20 rounded-xl" />
            <Shimmer className="h-8 w-20 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ServiceGridSkeletonProps {
  count?: number;
}

export const ServiceGridSkeleton = ({ count = 6 }: ServiceGridSkeletonProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
};
