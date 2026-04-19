import {
  Table,
  TableBody,
} from "@/components/ui/table"

import ListTableHeader from "./ListTableHeader"
import ListTableRow from "./ListTableRow"
import { Column } from "./types"

type Props<T> = {
  columns: Column<T>[]
  data: T[]
}

export default function ListTable<T>({ columns, data }: Props<T>) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">

        <Table>

          <ListTableHeader columns={columns} />

          <TableBody>
            {data.map((row, index) => (
              <ListTableRow
                key={index}
                columns={columns}
                row={row}
              />
            ))}
          </TableBody>

        </Table>

      </div>
    </div>
  )
}