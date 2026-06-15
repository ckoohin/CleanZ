"use client";

import React, { useCallback, useMemo } from "react";
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
      {/* ── Bulk Action Toolbar ── */}
      {selectedKeys.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-[20px] px-5 py-3.5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 border-b border-border/40 bg-transparent">
            {onKeywordChange && (
              <div className="relative flex-1 max-w-md">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={keyword}
                  onChange={(e) => onKeywordChange(e.target.value)}
                  placeholder={placeholderSearch}
                  className="pl-10 h-10 bg-muted/40 hover:bg-muted/60 border-transparent rounded-full focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-transparent transition-all text-[13px] shadow-none"
                />
              </div>
            )}
            {filters && (
              <div className="flex items-center gap-2 flex-wrap">{filters}</div>
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

            <TableBody>
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
                    <TableRow
                      key={key}
                      className={cn(
                        "border-b border-border/30 transition-colors duration-150",
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
                        <TableCell className="py-3 pr-4">
                          <div className="flex items-center justify-end gap-1">
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
                                    "h-8 w-8 rounded-full transition-all",
                                    variant === "destructive" &&
                                      "text-destructive/80 hover:text-destructive hover:bg-destructive/10",
                                    variant === "warning" &&
                                      "text-amber-600/80 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20",
                                    variant === "default" &&
                                      "text-muted-foreground/80 hover:text-foreground hover:bg-muted/60",
                                  )}
                                >
                                  {Icon ? (
                                    <Icon className="h-4 w-4" />
                                  ) : (
                                    <span className="text-xs">
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
                                    className="h-8 w-8 rounded-full text-muted-foreground/80 hover:text-foreground hover:bg-muted/60"
                                    aria-label="Thêm hành động"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48 rounded-xl border-border/50 shadow-lg"
                                >
                                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                                          "text-sm font-medium gap-2 cursor-pointer rounded-lg mx-1 focus:outline-none",
                                          variant === "destructive" &&
                                            "text-destructive focus:bg-destructive/10 focus:text-destructive",
                                          variant === "warning" &&
                                            "text-amber-600 focus:bg-amber-50 focus:text-amber-700 dark:focus:bg-amber-900/20",
                                        )}
                                      >
                                        {Icon && (
                                          <Icon className="h-4 w-4 shrink-0" />
                                        )}
                                        {action.label}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
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
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination Footer ── */}
        {!isLoading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/40 bg-transparent text-sm">
            {/* Total count */}
            <p className="text-muted-foreground/80 font-medium text-[13px] text-center sm:text-left">
              Hiển thị{" "}
              <span className="font-semibold text-foreground">{startItem}</span>{" "}
              - <span className="font-semibold text-foreground">{endItem}</span>{" "}
              trên{" "}
              <span className="font-semibold text-foreground">
                {totalItems}
              </span>{" "}
              bản ghi
              {selectedKeys.size > 0 && (
                <span className="ml-2 text-primary font-semibold">
                  ({selectedKeys.size} đã chọn)
                </span>
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Limit selector */}
              {onLimitChange && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">
                    Hiển thị
                  </span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => onLimitChange(Number(val))}
                  >
                    <SelectTrigger className="w-[70px] h-8 rounded-full border-border/40 bg-transparent hover:bg-muted/50 text-[13px] font-medium focus:ring-0 focus:ring-offset-0 shadow-none transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {[5, 10, 20, 50, 100].map((size) => (
                        <SelectItem
                          key={size}
                          value={String(size)}
                          className="text-xs font-medium"
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
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="h-8 w-8 rounded-full border-transparent hover:bg-muted/60 text-muted-foreground disabled:opacity-40 transition-all shadow-none"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {getPageNumbers().map((num, index) =>
                    num === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-muted-foreground text-xs select-none"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={num}
                        variant={num === page ? "default" : "outline"}
                        onClick={() => onPageChange(Number(num))}
                        className={cn(
                          "h-8 w-8 text-[13px] rounded-full font-medium transition-all shadow-none",
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
                    className="h-8 w-8 rounded-full border-transparent hover:bg-muted/60 text-muted-foreground disabled:opacity-40 transition-all shadow-none"
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
