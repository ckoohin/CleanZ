import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <Skeleton className="h-16 rounded-[2rem]" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="col-span-12 md:col-span-4">
            <Skeleton className="h-40 rounded-[2rem]" />
          </div>
        ))}
        <div className="col-span-12 lg:col-span-8">
          <Skeleton className="h-80 rounded-[2rem]" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Skeleton className="h-80 rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}
