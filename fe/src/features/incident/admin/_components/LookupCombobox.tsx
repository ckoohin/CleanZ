"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LookupItem } from "../services/admin-incident.service";

interface Props {
  placeholder: string;
  items: LookupItem[];
  isLoading: boolean;
  onQueryChange: (q: string) => void;
  selectedLabel: string | null;
  onSelect: (item: LookupItem) => void;
  onClear: () => void;
  debounceMs?: number;
}

/** Combobox tra cứu (Popover + cmdk), debounce, lọc server-side. */
export function LookupCombobox({
  placeholder,
  items,
  isLoading,
  onQueryChange,
  selectedLabel,
  onSelect,
  onClear,
  debounceMs = 300,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => onQueryChange(input), debounceMs);
    return () => clearTimeout(t);
  }, [input, debounceMs, onQueryChange]);

  return (
    // Nút xoá nằm NGOÀI nút mở popover: lồng hai phần tử bấm được vào nhau là
    // HTML không hợp lệ, và bàn phím không có cách nào chạm tới cái bên trong.
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn(
              "h-9 w-full justify-between rounded-lg border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-sm font-normal text-[var(--c-ink)]",
              selectedLabel ? "pr-14" : "pr-8",
              !selectedLabel && "text-[var(--c-muted)]",
            )}
          >
            <span className="truncate">{selectedLabel ?? placeholder}</span>
            <ChevronsUpDown className="absolute right-3 size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="cz-admin w-[var(--radix-popover-trigger-width)] p-0 bg-[var(--c-card)] text-[var(--c-ink)]"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Nhập để tìm..."
              value={input}
              onValueChange={setInput}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-[var(--c-muted)]">
                  <Loader2 className="size-3.5 animate-spin" /> Đang tìm...
                </div>
              ) : items.length === 0 ? (
                <CommandEmpty>
                  {input.trim() ? "Không tìm thấy" : "Nhập để tìm kiếm"}
                </CommandEmpty>
              ) : (
                items.map((it) => (
                  <CommandItem
                    key={it.id}
                    value={it.id}
                    onSelect={() => {
                      onSelect(it);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{it.label}</span>
                      {it.sub && (
                        <span className="text-xs text-[var(--c-muted)]">
                          {it.sub}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedLabel && (
        <button
          type="button"
          aria-label={`Xoá bộ lọc: ${placeholder}`}
          onClick={onClear}
          className="absolute right-8 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-[var(--c-muted)] hover:text-[var(--c-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
