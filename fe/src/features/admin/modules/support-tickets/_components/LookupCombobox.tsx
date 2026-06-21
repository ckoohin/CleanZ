"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LookupComboboxProps<T> {
  placeholder: string;
  searchPlaceholder?: string;
  items: T[];
  isLoading: boolean;
  /** Báo từ khoá (đã debounce) cho parent để gọi query. */
  onQueryChange: (q: string) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSub?: (item: T) => string;
  /** Nhãn của lựa chọn hiện tại (null = chưa chọn). */
  selectedKey: string | null;
  selectedLabel: string | null;
  onSelect: (item: T) => void;
  onClear: () => void;
  invalid?: boolean;
  debounceMs?: number;
}

export function LookupCombobox<T>({
  placeholder,
  searchPlaceholder = "Nhập để tìm...",
  items,
  isLoading,
  onQueryChange,
  getKey,
  getLabel,
  getSub,
  selectedKey,
  selectedLabel,
  onSelect,
  onClear,
  invalid,
  debounceMs = 300,
}: LookupComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  // Debounce input → onQueryChange
  useEffect(() => {
    const t = setTimeout(() => onQueryChange(input), debounceMs);
    return () => clearTimeout(t);
  }, [input, debounceMs, onQueryChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "h-9 w-full justify-between rounded-lg text-sm font-normal",
            !selectedLabel && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <span className="flex items-center gap-1 shrink-0">
            {selectedLabel && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {/* shouldFilter=false: lọc phía server, không lọc lại ở client */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={input}
            onValueChange={setInput}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tìm...
              </div>
            ) : items.length === 0 ? (
              <CommandEmpty>
                {input.trim() ? "Không tìm thấy kết quả" : "Nhập để tìm kiếm"}
              </CommandEmpty>
            ) : (
              items.map((item) => {
                const key = getKey(item);
                return (
                  <CommandItem
                    key={key}
                    value={key}
                    onSelect={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{getLabel(item)}</span>
                      {getSub && (
                        <span className="text-xs text-muted-foreground">{getSub(item)}</span>
                      )}
                    </div>
                    {selectedKey === key && <Check className="ml-auto h-4 w-4" />}
                  </CommandItem>
                );
              })
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
