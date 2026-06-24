"use client";

import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Button } from "./button";
import { cn } from "./utils";

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  emptyText?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  emptyText = "Không tìm thấy",
  className,
  icon,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8.5 px-3 rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground text-xs font-medium flex items-center justify-between gap-1.5 shadow-xs transition-all outline-hidden shrink-0",
            selectedOption && value !== "all" && value !== "ALL" ? "text-primary border-primary/30 bg-primary/5" : "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            {icon && <span className="shrink-0 opacity-70">{icon}</span>}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0 bg-popover border-border rounded-xl shadow-lg" align="start">
        <Command className="bg-popover text-popover-foreground">
          <CommandInput 
            placeholder="Tìm kiếm..." 
            className="h-8.5 text-xs placeholder:text-muted-foreground/60 border-none bg-transparent"
          />
          <CommandList className="max-h-48 border-t border-border/40">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground font-medium">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "text-xs font-medium flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer transition-colors mx-1 my-0.5",
                      isSelected 
                        ? "bg-primary/10 text-primary font-bold" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
