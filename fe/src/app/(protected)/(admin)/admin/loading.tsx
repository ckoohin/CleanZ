"use client"
import { Skeleton } from "@/components/ui/skeleton";

import * as React from "react"
import { motion } from "motion/react"
import { Sparkles, Loader2 } from "lucide-react"

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

// export function AdminLoading() {
//   return (
//     <div className="flex-1 w-full min-h-[60vh] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
//       {/* Brand Icon Animation */}
//       <div className="relative">
//         {/* Vòng sáng nhòe phía sau */}
//         <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />

//         {/* Vòng tròn loading */}
//         <div className="relative flex items-center justify-center w-24 h-24 bg-card rounded-full shadow-2xl border border-primary/20">
//           <motion.div
//             animate={{ rotate: 360 }}
//             transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
//             className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary/50 opacity-80"
//           />
//           <motion.div
//             animate={{ rotate: -360 }}
//             transition={{ repeat: Infinity, duration: 0.3 }}
//             className="absolute inset-2 rounded-full border-2der-transparent border-b-secondary border-l-secondary/50 opacity-60"
//           />
//           <Sparkles className="w-10 h-10 text-primary animate-pulse" />
//         </div>
//       </div>

//       {/* Text Animation */}
//       <div className="flex flex-col items-center gap-2">
//         <h3 className="text-xl font-bold tracking-widest text-primary/80 uppercase flex items-center gap-2">
//           Đang tải dữ liệu <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
//         </h3>
//         <p className="text-sm text-muted-foreground font-medium">
//           Vui lòng đợi trong giây lát...
//         </p>
//       </div>
//     </div>
//   )
// }
