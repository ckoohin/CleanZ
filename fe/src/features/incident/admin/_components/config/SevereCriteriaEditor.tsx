"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { formatVnd } from "@/features/incident/shared/incident.labels";

interface SevereCriteria {
  majorAmount?: number;
  severeAmount?: number;
  categories?: string[];
}

function parse(value: string): SevereCriteria {
  if (!value) return {};
  try {
    return JSON.parse(value) as SevereCriteria;
  } catch {
    return {};
  }
}

/**
 * Editor tiêu chí nghiêm trọng (phương án A): 2 ngưỡng tiền chia 3 bậc.
 * Lưu lại dạng chuỗi JSON `{ majorAmount, severeAmount, categories? }`.
 * Giữ nguyên `categories` (không chỉnh ở UI) để không mất cấu hình hiện có.
 */
export function SevereCriteriaEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (jsonString: string) => void;
}) {
  const [major, setMajor] = useState("");
  const [severe, setSevere] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const o = parse(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state sau mount / khi mở form; giữ nguyên hành vi hiện tại
    setMajor(o.majorAmount != null ? String(o.majorAmount) : "");
    setSevere(o.severeAmount != null ? String(o.severeAmount) : "");
    setCategories(o.categories ?? []);
  }, [value]);

  const emit = (nextMajor: string, nextSevere: string) => {
    const obj: SevereCriteria = {};
    if (nextMajor.trim()) obj.majorAmount = Number(nextMajor);
    if (nextSevere.trim()) obj.severeAmount = Number(nextSevere);
    if (categories.length) obj.categories = categories;
    onChange(JSON.stringify(obj));
  };

  const majorNum = Number(major) || 0;
  const severeNum = Number(severe) || 0;
  const invalid = !!major && !!severe && severeNum <= majorNum;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--c-line)] p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[var(--c-ink)]">Ngưỡng &quot;Lớn&quot; (≥)</Label>
          <Input
            type="number"
            min={0}
            value={major}
            onChange={(e) => {
              setMajor(e.target.value);
              emit(e.target.value, severe);
            }}
            placeholder="VND"
            className="h-9 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[var(--c-ink)]">Ngưỡng &quot;Nghiêm trọng&quot; (≥)</Label>
          <Input
            type="number"
            min={0}
            value={severe}
            onChange={(e) => {
              setSevere(e.target.value);
              emit(major, e.target.value);
            }}
            placeholder="VND"
            className="h-9 rounded-lg text-sm"
            aria-invalid={invalid}
          />
        </div>
      </div>

      {invalid && (
        <p className="flex items-center gap-1 text-xs text-[#D97706]">
          <AlertTriangle className="size-3.5" /> Ngưỡng &quot;Nghiêm trọng&quot; phải lớn hơn &quot;Lớn&quot;.
        </p>
      )}

      {/* Dải minh hoạ 3 bậc */}
      <div className="flex items-stretch overflow-hidden rounded-lg border border-[var(--c-line)] text-center text-[11px]">
        <div className="flex-1 bg-[var(--c-card-2)] px-2 py-1.5">
          <p className="font-semibold text-[var(--c-ink)]">Nhỏ</p>
          <p className="text-[var(--c-muted)]">&lt; {formatVnd(majorNum)}</p>
        </div>
        <div className="flex-1 bg-[rgba(217,119,6,0.14)] px-2 py-1.5">
          <p className="font-semibold text-[#D97706]">Lớn</p>
          <p className="text-[var(--c-muted)]">{formatVnd(majorNum)} – {formatVnd(severeNum)}</p>
        </div>
        <div className="flex-1 bg-[rgba(225,29,72,0.12)] px-2 py-1.5">
          <p className="font-semibold text-[#E11D48]">Nghiêm trọng</p>
          <p className="text-[var(--c-muted)]">≥ {formatVnd(severeNum)}</p>
        </div>
      </div>
    </div>
  );
}
