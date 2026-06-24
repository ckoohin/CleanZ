"use client";

import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "./button";

interface FilterGroupProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  showClearBtn?: boolean;
}

export function FilterGroup({ children, onClearAll, showClearBtn }: FilterGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
      <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wider pr-1 select-none">
        <Filter className="w-3.5 h-3.5" />
        <span>Lọc theo:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {children}
      </div>

      {showClearBtn && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8.5 px-3 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-all gap-1.5 shadow-none"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </Button>
      )}
    </div>
  );
}
