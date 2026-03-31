import {
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export default function TableSkeleton({
  rows = 6,
  columns = 6,
}: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>

          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-8 w-full max-w-[140px]" />
            </TableCell>
          ))}

        </TableRow>
      ))}
    </TableBody>
  )
}