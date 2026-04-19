import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Column } from "./types"

type Props<T> = {
  columns: Column<T>[]
}

export default function ListTableHeader<T>({ columns }: Props<T>) {
  return (
    <TableHeader className="bg-muted/40">
      <TableRow className="uppercase text-xs text-muted-foreground tracking-wider">

        {columns.map((col) => (
          <TableHead key={String(col.key)} className={col.className}>
            {col.title}
          </TableHead>
        ))}

      </TableRow>
    </TableHeader>
  )
}