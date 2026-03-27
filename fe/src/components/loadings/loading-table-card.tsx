import { Skeleton } from "@/components/ui/skeleton"

export function TableCardSkeleton() {
    return (
        <div className="rounded-2xl border p-5 shadow-sm bg-white">

            {/* header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">

                    <Skeleton className="size-10 rounded-xl" />

                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>

                </div>

                <Skeleton className="h-6 w-6 rounded-md" />
            </div>

            {/* divider */}
            <Skeleton className="my-4 h-px w-full" />

            {/* capacity */}
            <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-4 w-28" />
                </div>

                <Skeleton className="h-6 w-20 rounded-full" />

            </div>

            {/* service type */}
            <div className="mt-3 flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-3 w-16" />
            </div>

            {/* button */}
            <Skeleton className="mt-4 h-9 w-full rounded-xl" />

        </div>
    )
}