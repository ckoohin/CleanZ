"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardStore, PRESETS } from "../stores/dashboard.store";
import type { PresetKey } from "../types/dashboard.types";

export function PresetSelect() {
  const { currentPreset, setPreset } = useDashboardStore();

  return (
    <Select value={currentPreset} onValueChange={(v) => setPreset(v as PresetKey)}>
      <SelectTrigger className="w-40 rounded-xl text-xs font-semibold h-8">
        <SelectValue placeholder="Chế độ xem" />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(PRESETS) as [PresetKey, { label: string }][]).map(([key, { label }]) => (
          <SelectItem key={key} value={key} className="text-xs">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
