"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  SEVERITY,
  type Severity,
} from "@/features/incident/shared/incident.enums";
import { SEVERITY_LABEL } from "@/features/incident/shared/incident.labels";

// 5 mốc SLA. 4 mốc đầu lưu theo PHÚT (nhập theo giờ → ×60), autoclose lưu theo GIỜ.
const FIELDS = [
  { key: "receivedMins", label: "Tiếp nhận", unit: "min" },
  { key: "statementMins", label: "Giải trình", unit: "min" },
  { key: "decisionMins", label: "Quyết định", unit: "min" },
  { key: "executeMins", label: "Thực thi", unit: "min" },
  { key: "autocloseHours", label: "Tự đóng", unit: "hour" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

// Mặc định (giờ) — mirror DEFAULT_SLA của BE, dùng làm placeholder.
const DEFAULT_HOURS: Record<Severity, Record<FieldKey, number>> = {
  CRITICAL: {
    receivedMins: 4,
    statementMins: 24,
    decisionMins: 24,
    executeMins: 24,
    autocloseHours: 48,
  },
  MAJOR: {
    receivedMins: 12,
    statementMins: 36,
    decisionMins: 48,
    executeMins: 24,
    autocloseHours: 48,
  },
  MINOR: {
    receivedMins: 24,
    statementMins: 48,
    decisionMins: 72,
    executeMins: 24,
    autocloseHours: 48,
  },
};

type Matrix = Record<string, Partial<Record<FieldKey, number>>>;
type Draft = Record<Severity, Record<FieldKey, string>>;

const emptyDraft = (): Draft =>
  Object.fromEntries(
    SEVERITY.map((s) => [
      s,
      Object.fromEntries(FIELDS.map((f) => [f.key, ""])),
    ]),
  ) as Draft;

function parse(value: string): Matrix {
  if (!value) return {};
  try {
    return JSON.parse(value) as Matrix;
  } catch {
    return {};
  }
}

/** Quy đổi giá trị lưu (min/hour) → hiển thị GIỜ. */
const toHours = (key: FieldKey, stored: number) =>
  key === "autocloseHours" ? stored : stored / 60;
/** Quy đổi giờ nhập → giá trị lưu. */
const toStored = (key: FieldKey, hours: number) =>
  key === "autocloseHours" ? Math.round(hours) : Math.round(hours * 60);

/**
 * Editor ma trận SLA (phương án A): bảng 3 mức × 5 mốc, nhập theo GIỜ.
 * Bỏ trống = dùng mặc định hệ thống. Lưu chuỗi JSON theo đơn vị BE (phút/giờ).
 */
export function SlaMatrixEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (jsonString: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    const m = parse(value);
    const next = emptyDraft();
    for (const s of SEVERITY) {
      const entry = m[s];
      if (!entry) continue;
      for (const f of FIELDS) {
        const v = entry[f.key];
        if (v != null) next[s][f.key] = String(toHours(f.key, v));
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state sau mount / khi mở form; giữ nguyên hành vi hiện tại
    setDraft(next);
  }, [value]);

  const emit = (d: Draft) => {
    const matrix: Matrix = {};
    for (const s of SEVERITY) {
      const entry: Partial<Record<FieldKey, number>> = {};
      for (const f of FIELDS) {
        const raw = d[s][f.key];
        if (raw.trim() !== "") entry[f.key] = toStored(f.key, Number(raw));
      }
      if (Object.keys(entry).length) matrix[s] = entry;
    }
    onChange(Object.keys(matrix).length ? JSON.stringify(matrix) : "");
  };

  const setCell = (s: Severity, key: FieldKey, val: string) => {
    setDraft((prev) => {
      const next = { ...prev, [s]: { ...prev[s], [key]: val } };
      emit(next);
      return next;
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-[var(--c-line)] p-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-[var(--c-muted)]">
              <th className="px-1 py-1 text-left font-semibold">Mức độ</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="px-1 py-1 text-center font-semibold">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEVERITY.map((s) => (
              <tr key={s}>
                <td className="px-1 py-1 font-medium">{SEVERITY_LABEL[s]}</td>
                {FIELDS.map((f) => (
                  <td key={f.key} className="px-0.5 py-1">
                    <Input
                      type="number"
                      min={0}
                      value={draft[s][f.key]}
                      onChange={(e) => setCell(s, f.key, e.target.value)}
                      placeholder={String(DEFAULT_HOURS[s][f.key])}
                      className="h-8 w-16 rounded-md px-1.5 text-center text-xs"
                      aria-label={`${SEVERITY_LABEL[s]} - ${f.label} (giờ)`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[var(--c-muted)]">
        Đơn vị: <b>giờ</b>. Bỏ trống = dùng mặc định (giá trị mờ trong ô).
      </p>
    </div>
  );
}
