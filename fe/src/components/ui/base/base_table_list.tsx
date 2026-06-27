"use client";

import React, { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Trash2,
  Pencil,
  Eye,
  MoreHorizontal,
  Copy,
  Archive,
  Ban,
  CheckCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";
import { Input } from "../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { Button } from "../button";
import { Skeleton } from "../skeleton";
import { Checkbox } from "../checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import BaseEmptyState from "./base_empty_state";
import { cn } from "../utils";

// Brand amber gradient (kept inline so this base component stays self-contained).
const AMBER_GRADIENT = "linear-gradient(135deg, #FFB951 0%, #FF9800 100%)";

// ─────────────────────────────────────────────
//  Animations Variants
// ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Ẩn cột trên mobile */
  hideOnMobile?: boolean;
}

export type RowActionType =
  | "view"
  | "edit"
  | "delete"
  | "copy"
  | "archive"
  | "ban"
  | "approve";

export interface RowAction<T> {
  type?: RowActionType;
  label: string;
  icon?: LucideIcon;
  onClick: (row: T) => void;
  /** Ẩn action theo điều kiện */
  hidden?: (row: T) => boolean;
  /** Disable action theo điều kiện */
  disabled?: (row: T) => boolean;
  variant?: "default" | "destructive" | "warning";
  /** Chèn 1 đường ngăn cách phía trên mục này trong menu (vd: tách nhóm "Xóa"). */
  separatorBefore?: boolean;
}

export interface BulkAction<T> {
  label: string;
  icon?: LucideIcon;
  onClick: (selectedRows: T[]) => void;
  variant?: "default" | "destructive";
}

interface BaseTableListProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Key dùng làm ID duy nhất cho mỗi row (dùng cho selection) */
  rowKey?: keyof T;
  totalItems?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  keyword?: string;
  onKeywordChange?: (keyword: string) => void;
  placeholderSearch?: string;
  filters?: React.ReactNode;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  className?: string;
  /** Các hành động trên từng dòng — luôn gom vào menu "⋯" (design system §7). */
  rowActions?: RowAction<T>[];
  /** @deprecated Không còn dùng — mọi action giờ nằm trong menu "⋯". Giữ để tương thích lời gọi cũ. */
  inlineActionCount?: number;
  /** Các hành động khi chọn nhiều dòng */
  bulkActions?: BulkAction<T>[];
  /** Callback khi selection thay đổi */
  onSelectionChange?: (selectedRows: T[]) => void;
}

// ─────────────────────────────────────────────
//  Icon map cho RowAction type
// ─────────────────────────────────────────────

const ACTION_ICON_MAP: Record<RowActionType, LucideIcon> = {
  view: Eye,
  edit: Pencil,
  delete: Trash2,
  copy: Copy,
  archive: Archive,
  ban: Ban,
  approve: CheckCircle,
};

const ACTION_VARIANT_MAP: Record<
  RowActionType,
  "default" | "destructive" | "warning"
> = {
  view: "default",
  edit: "default",
  delete: "destructive",
  copy: "default",
  archive: "warning",
  ban: "destructive",
  approve: "default",
};

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

export function BaseTableList<T>({
  columns,
  data,
  rowKey,
  totalItems = 0,
  page = 1,
  limit = 10,
  onPageChange,
  onLimitChange,
  keyword = "",
  onKeywordChange,
  placeholderSearch = "Tìm kiếm...",
  filters,
  isLoading = false,
  emptyTitle = "Không tìm thấy kết quả nào",
  emptyDescription = "Thử thay đổi từ khóa hoặc bộ lọc để tìm kiếm lại nhé.",
  emptyIcon = Inbox,
  className,
  rowActions = [],
  bulkActions = [],
  onSelectionChange,
}: BaseTableListProps<T>) {
  const totalPages = Math.ceil(totalItems / limit);
  const startItem = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  // ── Selection state ──────────────────────────
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(
    new Set(),
  );

  const getKey = useCallback(
    (row: T, index: number): string => {
      if (rowKey && row[rowKey] !== undefined && row[rowKey] !== null) {
        return String(row[rowKey]);
      }
      return String(index);
    },
    [rowKey],
  );

  const selectedRows = useMemo(
    () => data.filter((row, idx) => selectedKeys.has(getKey(row, idx))),
    [data, selectedKeys, getKey],
  );

  const isAllSelected = data.length > 0 && selectedKeys.size === data.length;
  const isIndeterminate =
    selectedKeys.size > 0 && selectedKeys.size < data.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
      onSelectionChange?.([]);
    } else {
      const allKeys = new Set(data.map((row, idx) => getKey(row, idx)));
      setSelectedKeys(allKeys);
      onSelectionChange?.(data);
    }
  };

  const handleSelectRow = (row: T, index: number) => {
    const key = getKey(row, index);
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
    onSelectionChange?.(data.filter((r, i) => next.has(getKey(r, i))));
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
    onSelectionChange?.([]);
  };

  // Reset selection khi data thay đổi (page/filter)
  React.useEffect(() => {
    setSelectedKeys(new Set());
  }, [data]);

  // ── Pagination ───────────────────────────────
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages
      ];
    }

    return [
      1,
      "...",
      page - 1, page, page + 1,
      "...",
      totalPages
    ];
  };

  // ── Columns (thêm checkbox + actions) ────────
  const hasSelection = bulkActions.length > 0 || onSelectionChange;
  const hasActions = rowActions.length > 0;

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <div className={cn("space-y-3 w-full", className)}>
      {/* ── Bulk Action Toolbar (nổi cố định giữa vùng nội dung — không đẩy layout) ── */}
      {selectedKeys.size > 0 && (
        <div
          className="cz-bulkbar flex w-[calc(100vw-2rem)] max-w-2xl items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-[0_16px_40px_-12px_rgba(15,27,51,0.4)]"
          style={{ borderColor: "var(--c-line-strong)", background: "var(--c-card)" }}
        >
          <span
            className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ color: "var(--c-primary-strong)", background: "var(--c-primary-soft)" }}
          >
            {selectedKeys.size} đã chọn
          </span>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            {bulkActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={() => action.onClick(selectedRows)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
                    action.variant === "destructive"
                      ? "text-[#E11D48] hover:bg-[#E11D48]/10"
                      : "text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]",
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {action.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={clearSelection}
            className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
            aria-label="Bỏ chọn tất cả"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] shadow-[0_1px_2px_rgba(15,27,51,0.04),0_8px_24px_-14px_rgba(15,27,51,0.10)]">
        {/* ── Header: Search & Filter ── */}
        {(onKeywordChange || filters) && (
          <div className="flex flex-col gap-3 border-b border-[var(--c-line)] p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            {onKeywordChange && (
              <div className="relative w-full sm:max-w-sm sm:flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--c-muted)]"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={keyword}
                  onChange={(e) => onKeywordChange(e.target.value)}
                  placeholder={placeholderSearch}
                  className="h-9 w-full rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-card-2)] pl-8.5 pr-8 text-[12.5px] font-medium text-[var(--c-ink)] shadow-none transition-colors placeholder:text-[var(--c-muted)] focus-visible:border-[var(--c-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/20"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => onKeywordChange("")}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-2 top-1/2 flex size-5.5 -translate-y-1/2 items-center justify-center rounded-full text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            )}
            {filters && (
              <div
                className={cn(
                  "flex flex-shrink-0 flex-wrap items-center gap-2",
                  onKeywordChange ? "sm:ml-auto" : "w-full",
                )}
              >
                {filters}
              </div>
            )}
          </div>
        )}

        {/* ── Table ── */}
        <div className="cz-scroll overflow-x-auto w-full">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="border-b border-[var(--c-line)] hover:bg-transparent">
                {/* Checkbox Select All */}
                {hasSelection && (
                  <TableHead className="w-10 pl-4 pr-2">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement).dataset.indeterminate =
                            String(isIndeterminate);
                          // Shadcn checkbox trick for indeterminate
                          const input = el.querySelector?.(
                            "input",
                          ) as HTMLInputElement | null;
                          if (input) input.indeterminate = isIndeterminate;
                        }
                      }}
                      onCheckedChange={handleSelectAll}
                      aria-label="Chọn tất cả"
                      className="data-[state=checked]:bg-[var(--c-primary)] data-[state=checked]:border-[var(--c-primary)]"
                    />
                  </TableHead>
                )}

                {columns.map((col) => (
                  <TableHead
                    key={String(col.key)}
                    className={cn(
                      "h-11 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--c-muted)]",
                      col.hideOnMobile && "hidden sm:table-cell",
                      col.className,
                    )}
                  >
                    {col.title}
                  </TableHead>
                ))}

                {/* Actions header */}
                {hasActions && (
                  <TableHead className="w-[1%] whitespace-nowrap pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--c-muted)]">
                    Hành động
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <motion.tbody
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="[&_tr:last-child]:border-0"
            >
              {isLoading ? (
                // Skeleton rows
                [...Array(limit)].map((_, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className="border-b border-[var(--c-line)] hover:bg-transparent"
                  >
                    {hasSelection && (
                      <TableCell className="pl-4 pr-2 w-10">
                        <Skeleton className="h-4 w-4 rounded bg-[var(--c-card-2)]" />
                      </TableCell>
                    )}
                    {columns.map((col, colIndex) => (
                      <TableCell
                        key={colIndex}
                        className={cn(
                          "py-4",
                          col.hideOnMobile && "hidden sm:table-cell",
                        )}
                      >
                        <Skeleton className="h-5 w-3/4 rounded-md bg-[var(--c-card-2)]" />
                      </TableCell>
                    ))}
                    {hasActions && (
                      <TableCell className="py-4 pr-4">
                        <div className="flex justify-end">
                          <Skeleton className="h-8 w-8 rounded-lg bg-[var(--c-card-2)]" />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : data.length > 0 ? (
                // Data rows
                data.map((row, rowIndex) => {
                  const key = getKey(row, rowIndex);
                  const isSelected = selectedKeys.has(key);
                  const visibleActions = rowActions.filter(
                    (action) => !action.hidden?.(row),
                  );

                  return (
                    <motion.tr
                      key={key}
                      variants={itemVariants}
                      className={cn(
                        "border-b border-[var(--c-line)] transition-colors duration-150",
                        isSelected
                          ? "bg-[var(--c-primary-soft)]/50"
                          : "hover:bg-[var(--c-card-2)]",
                      )}
                    >
                      {/* Checkbox */}
                      {hasSelection && (
                        <TableCell
                          className="pl-4 pr-2 w-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleSelectRow(row, rowIndex)
                            }
                            aria-label={`Chọn dòng ${rowIndex + 1}`}
                            className="data-[state=checked]:bg-[var(--c-primary)] data-[state=checked]:border-[var(--c-primary)]"
                          />
                        </TableCell>
                      )}

                      {/* Data cells */}
                      {columns.map((col) => (
                        <TableCell
                          key={String(col.key)}
                          className={cn(
                            "py-4 text-[13px] font-medium text-[var(--c-ink-soft)]",
                            col.hideOnMobile && "hidden sm:table-cell",
                            col.className,
                          )}
                        >
                          {col.render
                            ? col.render(row)
                            : (row[col.key as keyof T] as React.ReactNode)}
                        </TableCell>
                      ))}

                      {/* Row Actions — menu "⋯" gọn (design system §7) */}
                      {hasActions && (
                        <TableCell
                          className="py-2.5 pr-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {visibleActions.length > 0 && (
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    aria-label="Hành động"
                                    className="grid size-8 place-items-center rounded-lg text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="cz-admin min-w-44 rounded-xl border-[var(--c-line)] shadow-lg"
                                >
                                  {visibleActions.map((action, actionIdx) => {
                                    const Icon =
                                      action.icon ??
                                      (action.type
                                        ? ACTION_ICON_MAP[action.type]
                                        : undefined);
                                    const variant =
                                      action.variant ??
                                      (action.type
                                        ? ACTION_VARIANT_MAP[action.type]
                                        : "default");
                                    const isDisabled = action.disabled?.(row);

                                    return (
                                      <React.Fragment key={actionIdx}>
                                        {action.separatorBefore && actionIdx > 0 && (
                                          <DropdownMenuSeparator />
                                        )}
                                        <DropdownMenuItem
                                          disabled={isDisabled}
                                          onSelect={() => action.onClick(row)}
                                          className={cn(
                                            "cursor-pointer gap-2 rounded-lg py-1.5 text-[13px] font-medium focus:outline-none",
                                            variant === "destructive" &&
                                              "text-[#E11D48] focus:bg-[#E11D48]/10 focus:text-[#E11D48]",
                                            variant === "warning" &&
                                              "text-[#D97706] focus:bg-[#D97706]/10 focus:text-[#D97706]",
                                          )}
                                        >
                                          {Icon && <Icon className="size-4 shrink-0" />}
                                          {action.label}
                                        </DropdownMenuItem>
                                      </React.Fragment>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })
              ) : (
                // Empty state
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell
                    colSpan={
                      columns.length +
                      (hasSelection ? 1 : 0) +
                      (hasActions ? 1 : 0)
                    }
                    className="p-0 border-none"
                  >
                    <div className="p-8">
                      <BaseEmptyState
                        title={emptyTitle}
                        description={emptyDescription}
                        icon={emptyIcon}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </motion.tbody>
          </Table>
        </div>

        {/* ── Pagination Footer ── */}
        {!isLoading && totalItems > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--c-line)] bg-transparent px-5 py-3 text-sm sm:flex-row">
            {/* Total count */}
            <p className="flex items-center justify-center gap-1.5 text-center text-[12.5px] font-medium text-[var(--c-muted)] sm:justify-start sm:text-left">
              <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--c-primary)]" />
              <span>
                Hiển thị <span className="font-bold text-[var(--c-primary-strong)]">{startItem}–{endItem}</span> trong <span className="font-bold text-[var(--c-primary-strong)]">{totalItems}</span> bản ghi
              </span>
              {selectedKeys.size > 0 && (
                <span className="ml-1 font-bold text-[var(--c-primary-strong)]">
                  ({selectedKeys.size} đã chọn)
                </span>
              )}
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              {/* Limit selector */}
              {onLimitChange && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
                    Hiển thị
                  </span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => onLimitChange(Number(val))}
                  >
                    <SelectTrigger className="!inline-flex !h-6 !w-auto !items-center !justify-start !gap-1 !px-1.5 !py-0 rounded-md border-[var(--c-line-strong)] bg-transparent !text-[10px] font-bold shadow-none transition-all hover:bg-[var(--c-card-2)] focus:ring-0 focus:ring-offset-0 [&_svg]:!size-2.5 [&_svg]:opacity-60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="cz-admin rounded-lg">
                      {[5, 10, 20, 50, 100].map((size) => (
                        <SelectItem
                          key={size}
                          value={String(size)}
                          className="text-[11px] font-medium py-1"
                        >
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Page navigation */}
              {onPageChange && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] shadow-none transition-colors hover:text-[var(--c-ink)] disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {getPageNumbers().map((num, index) =>
                    num === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="select-none px-1 text-[13px] text-[var(--c-muted)]"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={num}
                        variant="outline"
                        onClick={() => onPageChange(Number(num))}
                        style={num === page ? { background: AMBER_GRADIENT } : undefined}
                        className={cn(
                          "h-9 w-9 rounded-lg text-[13px] font-semibold tabular-nums shadow-none transition-colors",
                          num === page
                            ? "border-transparent text-white"
                            : "border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]",
                        )}
                      >
                        {num}
                      </Button>
                    ),
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] shadow-none transition-colors hover:text-[var(--c-ink)] disabled:opacity-40"
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
