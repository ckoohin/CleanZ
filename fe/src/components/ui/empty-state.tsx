import { Table2 } from "lucide-react"

export default function EmptyState({
  title,
  description
}: {
  title: string
  description?: string
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">

      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[var(--savory-light)] text-[var(--savory-green)]">
        <Table2 size={28} />
      </div>

      <h3 className="text-lg font-semibold text-[var(--text-main)]">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {description}
        </p>
      )}

    </div>
  )
}
