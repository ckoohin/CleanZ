export type Column<T> = {
  key: keyof T | string
  title: string
  render?: (row: T) => React.ReactNode
  className?: string
}