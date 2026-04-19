import {
  TableCell,
  TableRow,
} from "@/components/ui/table"

import { Column } from "./types"

type Props<T> = {
  row: T
  columns: Column<T>[]
}

export default function ListTableRow<T>({ row, columns }: Props<T>) {
  return (
    <TableRow className="hover:bg-muted/50">

      {columns.map((col) => (
        <TableCell key={String(col.key)}>

          {col.render
            ? col.render(row)
            : (row[col.key as keyof T] as React.ReactNode)}

        </TableCell>
      ))}

    </TableRow>
  )
}