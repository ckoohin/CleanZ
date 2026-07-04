"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAdminBlogCategories } from "../hooks/useBlog";

type BlogCategorySelectProps = {
  value?: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
};

export function BlogCategorySelect({ value, onChange, disabled }: BlogCategorySelectProps) {
  const [open, setOpen] = useState(false);
  const { data: categories = [], isLoading } = useAdminBlogCategories();
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === value),
    [categories, value],
  );

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-10 flex-1 justify-between rounded-lg border-[var(--c-line)] bg-[var(--c-card)] text-left font-normal"
          >
            <span className="flex min-w-0 items-center gap-2">
              <FolderOpen className="h-4 w-4 shrink-0 text-[var(--c-muted)]" />
              <span className={cn("truncate", !selectedCategory && "text-[var(--c-muted)]")}>
                {selectedCategory ? selectedCategory.name : isLoading ? "Đang tải danh mục..." : "Chọn danh mục"}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm danh mục..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy danh mục</CommandEmpty>
              <CommandGroup>
                {categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={`${category.name} ${category.slug}`}
                    onSelect={() => {
                      onChange(category.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === category.id ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--c-muted)]">{category.slug}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-lg"
          disabled={disabled}
          onClick={() => onChange("")}
          aria-label="Bỏ chọn danh mục"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
