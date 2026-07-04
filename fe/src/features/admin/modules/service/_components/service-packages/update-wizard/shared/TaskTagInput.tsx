"use client";

import { useState, useCallback, useRef, KeyboardEvent } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TaskTagInput ─────────────────────────────────────────────────────────────
export function TaskTagInput({ value, onChange, placeholder, variant }: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  variant: "included" | "excluded";
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isIncluded = variant === "included";

  const add = useCallback(() => {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
  }, [input, value, onChange]);

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && value.length > 0) remove(value.length - 1);
  };

  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden transition-all",
      isIncluded ? "border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10"
                 : "border-rose-200/70 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-900/10")}>
      <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b text-xs font-black uppercase tracking-widest",
        isIncluded ? "border-emerald-200/50 bg-emerald-100/40 text-emerald-700 dark:text-emerald-400"
                   : "border-rose-200/50 bg-rose-100/40 text-rose-600 dark:text-rose-400")}>
        <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0",
          isIncluded ? "bg-emerald-500" : "bg-rose-500")}>
          {isIncluded ? <Check className="w-2.5 h-2.5 text-white" /> : <X className="w-2.5 h-2.5 text-white" />}
        </div>
        {isIncluded ? "Công việc bao gồm" : "Không bao gồm"}
        <span className="ml-auto">{value.length} mục</span>
      </div>
      <div className="min-h-[72px] p-3 flex flex-wrap gap-2 cursor-text" onClick={() => inputRef.current?.focus()}>
        {value.map((tag, i) => (
          <span key={i} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border",
            isIncluded ? "bg-emerald-500/10 text-emerald-700 border-emerald-300/50"
                       : "bg-rose-500/10 text-rose-600 border-rose-300/50")}>
            {tag}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(i); }}
              className="w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100">
              <X className="w-2 h-2" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder={value.length === 0 ? placeholder : "Thêm..."}
            className="flex-1 bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground/50 py-1" />
          {input.trim() && (
            <button type="button" onClick={add}
              className={cn("text-xs font-bold px-2 py-0.5 rounded-lg",
                isIncluded ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500")}>
              +Thêm
            </button>
          )}
        </div>
      </div>
      <div className={cn("px-4 py-1.5 border-t text-[10px] opacity-60",
        isIncluded ? "border-emerald-200/40 text-emerald-600" : "border-rose-200/40 text-rose-500")}>
        Enter / dấu phẩy để thêm · Backspace để xoá
      </div>
    </div>
  );
}
