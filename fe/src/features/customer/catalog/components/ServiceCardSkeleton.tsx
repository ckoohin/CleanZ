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
        "bg-card rounded-2xl border border-border/40 overflow-hidden",
        className
      )}
    >
      {/* Image skeleton */}
      <Shimmer className="aspect-[4/3] w-full rounded-none" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Shimmer className="h-5 w-3/4 rounded-md" />

        {/* Description lines */}
        <div className="space-y-1.5">
          <Shimmer className="h-3.5 w-full rounded-md" />
          <Shimmer className="h-3.5 w-5/6 rounded-md" />
        </div>

        {/* Badges */}
        <div className="flex gap-2 pt-1">
          <Shimmer className="h-5 w-16 rounded-full" />
          <Shimmer className="h-5 w-20 rounded-full" />
        </div>

        <div className="border-t border-border/40 pt-3 space-y-2">
          {/* Duration + Area */}
          <Shimmer className="h-4 w-24 rounded-md" />
          <Shimmer className="h-4 w-32 rounded-md" />
        </div>

        <div className="border-t border-border/40 pt-3 flex items-end justify-between">
          <div className="space-y-1">
            <Shimmer className="h-3 w-12 rounded-md" />
            <Shimmer className="h-6 w-28 rounded-md" />
          </div>
          {/* CTA Button */}
          <Shimmer className="h-9 w-24 rounded-xl" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
};
