"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BaseButton } from "@/components/ui/base/base_button";

interface DynamicListInputProps {
  value?: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DynamicListInput({ value = [], onChange, placeholder, disabled }: DynamicListInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    onChange([...value, inputValue.trim()]);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const newValues = value.filter((_, index) => index !== indexToRemove);
    onChange(newValues);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Nhập giá trị và nhấn Enter..."}
          disabled={disabled}
          className="flex-1"
        />
        <BaseButton
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim()}
        >
          <Plus className="w-4 h-4 mr-1" />
          Thêm
        </BaseButton>
      </div>

      {value.length > 0 && (
        <ul className="flex flex-col gap-2 mt-2">
          {value.map((item, index) => (
            <li
              key={index}
              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg text-sm border border-border"
            >
              <span>{item}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
