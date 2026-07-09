"use client";

import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

const triggerClass =
  "w-[62px] min-w-0 shrink-0 rounded-md border-0 bg-transparent px-2 py-1 text-sm font-bold shadow-none " +
  "hover:bg-slate-100 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-slate-100";

export function TimeSelect({ value, onChange, className }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [h, m] = value ? value.split(":") : ["08", "00"];
  const hour = HOURS.includes(h) ? h : "08";
  const minute = MINUTES.includes(m) ? m : "00";

  return (
    <div className={cn("flex items-center", className)}>
      <Select value={hour} onValueChange={nh => onChange(`${nh}:${minute}`)}>
        <SelectTrigger size="sm" className={triggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white max-h-64 min-w-18">
          {HOURS.map(hh => (
            <SelectItem key={hh} value={hh} className="text-sm font-semibold cursor-pointer">{hh}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-slate-400 font-bold text-sm px-0.5">:</span>
      <Select value={minute} onValueChange={nm => onChange(`${hour}:${nm}`)}>
        <SelectTrigger size="sm" className={triggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white max-h-64 min-w-18">
          {MINUTES.map(mm => (
            <SelectItem key={mm} value={mm} className="text-sm font-semibold cursor-pointer">{mm}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
