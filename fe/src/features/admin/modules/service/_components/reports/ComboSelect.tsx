"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";

export interface ComboSelectOption {
  value: string;
  label: string;
  sub?: string;
}

export interface ComboSelectProps {
  options: ComboSelectOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  icon?: React.ReactNode;
}

/**
 * Select vừa bấm-chọn vừa gõ-tìm — lọc client-side qua cmdk (danh sách nhỏ,
 * không cần debounce gọi API). PopoverContent gắn class cz-admin vì Radix
 * portal ra ngoài document.body, thoát khỏi phạm vi biến --c-* (xem AdminDialog).
 */
export function ComboSelect({
  options, value, onChange, placeholder, searchPlaceholder = "Gõ để tìm...", emptyText = "Không tìm thấy kết quả", className, icon,
}: ComboSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border-2 text-sm font-semibold transition-all shadow-sm w-full sm:w-56",
            "bg-(--c-card-2) border-(--c-line) hover:border-(--c-primary)/70 hover:shadow-md focus:outline-none",
            open && "border-(--c-primary) ring-2 ring-(--c-primary)/20 bg-(--c-card)",
            className,
          )}
        >
          {icon && (
            <span className="grid place-items-center size-6 rounded-lg bg-(--c-primary-soft) shrink-0">
              {icon}
            </span>
          )}
          <span className={cn("truncate flex-1 text-left", selected ? "text-(--c-ink)" : "text-(--c-muted) font-normal")}>
            {selected?.label ?? placeholder}
          </span>
          {selected ? (
            <X
              className="w-3.5 h-3.5 text-(--c-muted) hover:text-(--c-ink) shrink-0"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
            />
          ) : (
            <ChevronsUpDown className="w-3.5 h-3.5 text-(--c-muted) shrink-0 opacity-60" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="cz-admin w-[var(--radix-popover-trigger-width)] p-0 bg-(--c-card) border-(--c-line)/60">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty className="text-(--c-muted) text-sm">{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value === value ? undefined : opt.value);
                    setOpen(false);
                  }}
                  className="text-(--c-ink) data-[selected=true]:bg-(--c-card-2) cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.sub && <span className="text-xs text-(--c-muted) truncate">{opt.sub}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
