"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useBankList } from "@/lib/hooks/useBankList";

interface BankSelectProps {
  /** The selected bank BIN (e.g. "970436") */
  value?: string;
  onChange: (bin: string, shortName: string) => void;
  placeholder?: string;
  className?: string;
  /** Extra class forwarded to the trigger button */
  triggerClassName?: string;
}

/**
 * Searchable bank picker backed by GET /wallet/banks (VietQR list, cached 1h).
 * Stores the BIN in `value`; calls `onChange(bin, shortName)` on selection.
 */
export function BankSelect({
  value,
  onChange,
  placeholder = "Chọn ngân hàng...",
  triggerClassName,
}: BankSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: banks = [], isLoading } = useBankList();

  const selected = banks.find((b) => b.bin === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "inline-flex w-full items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors",
            "hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring",
            open && "border-primary ring-2 ring-ring",
            triggerClassName,
          )}
        >
          {isLoading ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn(
              "flex-1 truncate text-left",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selected ? selected.shortName : placeholder}
          </span>
          {selected && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {selected.bin}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="Tìm ngân hàng..." />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
              Không tìm thấy ngân hàng.
            </CommandEmpty>
            <CommandGroup>
              {banks.map((bank) => (
                <CommandItem
                  key={bank.bin}
                  value={`${bank.shortName} ${bank.name} ${bank.bin}`}
                  onSelect={() => {
                    onChange(bank.bin, bank.shortName);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === bank.bin ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {bank.shortName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {bank.name}
                    </span>
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
