"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DropdownProps } from "react-day-picker";
import { vi } from "date-fns/locale";
import "react-day-picker/dist/style.css";

import { cn } from "./utils";
import { buttonVariants } from "./button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select";

// Custom Dropdown Month/Year using Radix UI Select for beautiful, modern popup selectors
function CustomDropdown({ value, onChange, options, className, ...props }: DropdownProps) {
  const handleValueChange = (newValue: string) => {
    if (onChange) {
      const event = {
        target: { value: newValue }
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(event);
    }
  };

  return (
    <Select value={value?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger 
        size="sm" 
        className={cn(
          "h-7 text-xs font-bold rounded-lg border border-border/60 hover:bg-primary/5 hover:border-primary/30 transition-all text-foreground select-none px-2.5 py-1 flex items-center justify-between gap-1 bg-background focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[250px] z-50 bg-popover text-popover-foreground rounded-lg border shadow-md">
        {options?.map((opt) => (
          <SelectItem key={opt.value} value={opt.value.toString()} className="text-xs font-bold rounded-md cursor-pointer">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface NavigationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

// Custom Previous Button with Lucide Chevron Icon for a cleaner modern look
function CustomPrevious({ className, ...props }: NavigationButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "size-8 bg-background border border-border/60 hover:bg-primary/5 hover:border-primary/30 rounded-lg flex items-center justify-center p-0 text-foreground transition-all duration-200 active:scale-95 shadow-sm z-10 pointer-events-auto",
        className
      )}
      {...props}
    >
      <ChevronLeft className="size-4 text-foreground/80" />
    </button>
  );
}

// Custom Next Button with Lucide Chevron Icon for a cleaner modern look
function CustomNext({ className, ...props }: NavigationButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "size-8 bg-background border border-border/60 hover:bg-primary/5 hover:border-primary/30 rounded-lg flex items-center justify-center p-0 text-foreground transition-all duration-200 active:scale-95 shadow-sm z-10 pointer-events-auto",
        className
      )}
      {...props}
    >
      <ChevronRight className="size-4 text-foreground/80" />
    </button>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={vi}
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      fromYear={new Date().getFullYear()}
      toYear={new Date().getFullYear() + 5}
      className={cn("p-3 w-full", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2 w-full",
        month: "flex flex-col gap-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center w-full gap-1.5",
        caption_label: "hidden",
        caption_dropdowns: "flex justify-center items-center gap-1.5 z-10 text-xs font-bold",
        dropdown: "flex items-center gap-1",
        dropdown_month: "min-w-[105px]",
        dropdown_year: "min-w-[85px]",
        nav: "flex items-center justify-between absolute left-0 right-0 top-3 px-4 pointer-events-none z-10 w-full",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between w-full",
        weekday: "text-muted-foreground rounded-md w-10 md:w-12 font-normal text-[0.8rem] md:text-sm text-center flex items-center justify-center shrink-0",
        week: "flex justify-between w-full mt-2",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex items-center justify-center w-10 md:w-12 bg-transparent border-none",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 md:size-11 p-0 font-semibold text-xs md:text-sm flex items-center justify-center rounded-lg transition-all duration-200 bg-transparent hover:bg-muted text-foreground/90",
        ),
        selected: "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground [&_button]:focus:bg-primary [&_button]:focus:text-primary-foreground [&_button]:shadow-md [&_button]:shadow-primary/20",
        today: "[&_button]:bg-primary/10 [&_button]:text-primary [&_button]:border [&_button]:border-primary/35 [&_button]:font-extrabold",
        outside: "day-outside pointer-events-none [&_button]:text-muted-foreground/30 [&_button]:opacity-40 [&_button]:bg-transparent [&_button]:border-transparent [&_button]:shadow-none",
        disabled: "pointer-events-none [&_button]:text-muted-foreground/25 [&_button]:opacity-30 [&_button]:bg-transparent [&_button]:border-transparent [&_button]:shadow-none",
        range_start: "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        range_end: "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        ...classNames,
      }}
      components={{
        PreviousMonthButton: CustomPrevious,
        NextMonthButton: CustomNext,
        Dropdown: CustomDropdown
      }}
      {...props}
    />
  );
}

export { Calendar };
