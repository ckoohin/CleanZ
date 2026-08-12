"use client";

import React, { useMemo, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";

import { BaseButton } from "@/components/ui/base/base_button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSystemConfig, useUpdateSystemConfig } from "../hooks/useSystemConfig";
import type { SystemConfigGroup } from "../types/system-config.types";

interface SystemConfigGroupCardProps {
  group: SystemConfigGroup;
  description: string;
  icon: React.ReactNode;
}

/** Render mọi setting thuộc 1 group trong registry của backend, lưu độc lập với các card khác. */
export function SystemConfigGroupCard({
  group,
  description,
  icon,
}: SystemConfigGroupCardProps) {
  const { data, isLoading } = useSystemConfig();
  const updateConfig = useUpdateSystemConfig();

  // Chỉ giữ các ô đã bị sửa; ô chưa đụng tới luôn đọc thẳng giá trị server trả về,
  // nên không cần effect đồng bộ lại sau khi lưu.
  const [edits, setEdits] = useState<Record<string, string>>({});

  const items = useMemo(
    () => (data?.items ?? []).filter((item) => item.group === group),
    [data, group],
  );

  const changedItems = items.filter(
    (item) =>
      edits[item.key] !== undefined && edits[item.key] !== String(item.value),
  );

  const handleSave = () => {
    if (changedItems.length === 0) return;

    updateConfig.mutate(
      Object.fromEntries(
        changedItems.map((item) => [item.key, Number(edits[item.key])]),
      ),
      { onSuccess: () => setEdits({}) },
    );
  };

  return (
    <Card className="border-[var(--c-line)] bg-[var(--c-card)] backdrop-blur-sm shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          {icon}
          {data?.groupLabels?.[group] ?? "Cấu hình"}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pb-6">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-[var(--c-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Đang tải cấu hình...</span>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor={item.key}
                    className="text-xs font-bold uppercase text-[var(--c-muted)] tracking-wider"
                  >
                    {item.label}
                    {item.unit ? ` (${item.unit})` : ""}
                  </Label>
                  {!item.isOverridden && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)] bg-[var(--c-card-2)] border border-[var(--c-line)] rounded-full px-2 py-0.5">
                      Mặc định
                    </span>
                  )}
                </div>

                <Input
                  id={item.key}
                  type="number"
                  min={item.min}
                  max={item.max}
                  value={edits[item.key] ?? String(item.value)}
                  onChange={(event) =>
                    setEdits((prev) => ({
                      ...prev,
                      [item.key]: event.target.value,
                    }))
                  }
                  className="rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] font-mono text-[var(--c-primary-strong)]"
                />

                <p className="text-[10px] text-[var(--c-muted)]">
                  {item.description} Cho phép{" "}
                  {item.min.toLocaleString("vi-VN")} -{" "}
                  {item.max.toLocaleString("vi-VN")}
                  {item.unit ? ` ${item.unit}` : ""}.
                </p>
              </div>
            ))}

            <div className="flex items-center justify-end gap-2 pt-2">
              <BaseButton
                type="button"
                variant="glass"
                onClick={() => setEdits({})}
                disabled={changedItems.length === 0 || updateConfig.isPending}
                className="rounded-xl gap-2 h-10"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">
                  Hoàn tác
                </span>
              </BaseButton>

              <BaseButton
                type="button"
                variant="primary"
                onClick={handleSave}
                isLoading={updateConfig.isPending}
                disabled={changedItems.length === 0}
                className="rounded-xl gap-2 h-10 px-5"
              >
                <Save className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">
                  Lưu
                </span>
              </BaseButton>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
