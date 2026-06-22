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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Badge } from "../badge";
import BaseEmptyState from "./base_empty_state";
import { cn } from "../utils";

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
  /** Các hành động trên từng dòng */
  rowActions?: RowAction<T>[];
  /** Số action hiển thị trực tiếp (còn lại vào dropdown) */
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
  inlineActionCount = 2,
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

  const inlineActions = rowActions.slice(0, inlineActionCount);
  const dropdownActions = rowActions.slice(inlineActionCount);

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <div className={cn("space-y-3 w-full", className)}>
      {/* ── Bulk Action Toolbar (nổi, fixed — không đẩy layout) ── */}
      {selectedKeys.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex w-[calc(100vw-2rem)] max-w-2xl items-center gap-3 bg-card/95 backdrop-blur-md border border-primary/30 rounded-[20px] px-5 py-3.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs px-2.5 py-1 shrink-0"
          >
            {selectedKeys.size} đã chọn
          </Badge>

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {bulkActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Button
                  key={i}
                  size="sm"
                  variant={
                    action.variant === "destructive" ? "destructive" : "outline"
                  }
                  onClick={() => {
                    action.onClick(selectedRows);
                  }}
                  className={cn(
                    "h-8 text-[13px] font-medium gap-1.5 rounded-full transition-all shadow-none",
                    action.variant === "destructive"
                      ? "border-transparent bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      : "border-transparent bg-background hover:bg-muted text-foreground/80",
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {action.label}
                </Button>
              );
            })}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={clearSelection}
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Bỏ chọn tất cả"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="bg-card rounded-[24px] border border-border/40 shadow-sm flex flex-col overflow-hidden">
        {/* ── Header: Search & Filter ── */}
        {(onKeywordChange || filters) && (
          <div className="flex flex-col gap-3 border-b border-border/40 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            {onKeywordChange && (
              <div className="relative w-full sm:max-w-sm sm:flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={keyword}
                  onChange={(e) => onKeywordChange(e.target.value)}
                  placeholder={placeholderSearch}
                  className="h-8.5 w-full rounded-lg border border-border/50 bg-muted/30 pl-8.5 pr-8 text-[11px] font-medium shadow-none transition-colors hover:bg-muted/50 focus-visible:border-primary/40 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => onKeywordChange("")}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-2 top-1/2 flex size-5.5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
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
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="border-b border-border/40 hover:bg-transparent">
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
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableHead>
                )}

                {columns.map((col) => (
                  <TableHead
                    key={String(col.key)}
                    className={cn(
                      "h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 py-3",
                      col.hideOnMobile && "hidden sm:table-cell",
                      col.className,
                    )}
                  >
                    {col.title}
                  </TableHead>
                ))}

                {/* Actions header */}
                {hasActions && (
                  <TableHead className="w-auto text-right pr-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
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
                    className="border-b border-border/30 hover:bg-transparent"
                  >
                    {hasSelection && (
                      <TableCell className="pl-4 pr-2 w-10">
                        <Skeleton className="h-4 w-4 rounded" />
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
                        <Skeleton className="h-5 w-3/4 rounded-md" />
                      </TableCell>
                    ))}
                    {hasActions && (
                      <TableCell className="py-4 pr-4">
                        <div className="flex justify-end gap-1.5">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
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

                  return (
                    <motion.tr
                      key={key}
                      variants={itemVariants}
                      className={cn(
                        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors duration-150",
                        isSelected
                          ? "bg-primary/5 hover:bg-primary/8"
                          : "hover:bg-muted/30",
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
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                      )}

                      {/* Data cells */}
                      {columns.map((col) => (
                        <TableCell
                          key={String(col.key)}
                          className={cn(
                            "py-4 text-[13px] font-medium text-foreground/80",
                            col.hideOnMobile && "hidden sm:table-cell",
                            col.className,
                          )}
                        >
                          {col.render
                            ? col.render(row)
                            : (row[col.key as keyof T] as React.ReactNode)}
                        </TableCell>
                      ))}

                      {/* Row Actions */}
                      {hasActions && (
                        <TableCell className="py-2.5 pr-4">
                          <div className="flex justify-end">
                            <div className="inline-flex items-center gap-0.5 bg-muted/40 border border-border/40 rounded-lg p-0.5 shadow-sm">
                              {/* Inline actions */}
                              {inlineActions.map((action, actionIdx) => {
                                if (action.hidden?.(row)) return null;
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
                                  <Button
                                    key={actionIdx}
                                    variant="ghost"
                                    size="icon"
                                    disabled={isDisabled}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      action.onClick(row);
                                    }}
                                    title={action.label}
                                    aria-label={action.label}
                                    className={cn(
                                      "h-6.5 w-6.5 rounded-md transition-all shadow-none",
                                      variant === "destructive" &&
                                        "text-destructive/80 hover:text-destructive hover:bg-destructive/15",
                                      variant === "warning" &&
                                        "text-amber-600/80 hover:text-amber-600 hover:bg-amber-500/10",
                                      variant === "default" &&
                                        "text-muted-foreground hover:text-foreground hover:bg-muted",
                                    )}
                                  >
                                    {Icon ? (
                                      <Icon className="h-3.5 w-3.5" />
                                    ) : (
                                      <span className="text-[10px] font-bold">
                                        {action.label.charAt(0)}
                                      </span>
                                    )}
                                  </Button>
                                );
                              })}

                              {/* Dropdown for remaining actions */}
                              {dropdownActions.length > 0 && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6.5 w-6.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-none"
                                      aria-label="Thêm hành động"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-44 rounded-xl border-border/50 shadow-lg"
                                  >
                                    <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                      Hành động khác
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {dropdownActions.map((action, actionIdx) => {
                                      if (action.hidden?.(row)) return null;
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
                                        <DropdownMenuItem
                                          key={actionIdx}
                                          disabled={isDisabled}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            action.onClick(row);
                                          }}
                                          className={cn(
                                            "text-xs font-medium gap-2 cursor-pointer rounded-lg mx-1 focus:outline-none py-1.5",
                                            variant === "destructive" &&
                                              "text-destructive focus:bg-destructive/10 focus:text-destructive",
                                            variant === "warning" &&
                                              "text-amber-600 focus:bg-amber-50 focus:text-amber-700 dark:focus:bg-amber-900/20",
                                          )}
                                        >
                                          {Icon && (
                                            <Icon className="h-3.5 w-3.5 shrink-0" />
                                          )}
                                          {action.label}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-border/40 bg-transparent text-sm">
            {/* Total count */}
            <p className="text-muted-foreground/90 font-medium text-[11px] text-center sm:text-left flex items-center justify-center sm:justify-start gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#FFA000] shrink-0" />
              <span>
                Hiển thị <span className="font-bold text-[#FFA000]">{startItem}–{endItem}</span> trong <span className="font-bold text-[#FFA000]">{totalItems}</span> bản ghi
              </span>
              {selectedKeys.size > 0 && (
                <span className="ml-1 text-primary font-bold">
                  ({selectedKeys.size} đã chọn)
                </span>
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Limit selector */}
              {onLimitChange && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                    Hiển thị
                  </span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => onLimitChange(Number(val))}
                  >
                    <SelectTrigger className="!w-auto !h-6 rounded-md border-border/40 bg-transparent hover:bg-muted/50 !text-[10px] font-bold focus:ring-0 focus:ring-offset-0 shadow-none transition-all !py-0 !px-1.5 !gap-1 !inline-flex !justify-start !items-center [&_svg]:!size-2.5 [&_svg]:opacity-60 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
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
                    className="h-6 w-6 rounded-md border-transparent hover:bg-muted/60 text-muted-foreground disabled:opacity-40 transition-all shadow-none"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>

                  {getPageNumbers().map((num, index) =>
                    num === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-1 text-muted-foreground text-[9px] select-none"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={num}
                        variant={num === page ? "default" : "outline"}
                        onClick={() => onPageChange(Number(num))}
                        className={cn(
                          "h-6 w-6 text-[10px] rounded-md font-bold transition-all shadow-none",
                          num === page
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                            : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground",
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
                    className="h-6 w-6 rounded-md border-transparent hover:bg-muted/60 text-muted-foreground disabled:opacity-40 transition-all shadow-none"
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="h-3 w-3" />
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
