"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  Clock,
  Loader2,
  MapPin,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useOperationalPolicies,
  useUpdateCheckinOperationPolicy,
  useUpdateCustomerSchedulingPolicy,
  useUpdateTaskerCancellationPolicy,
} from "../hooks/useSystemConfig";
import type {
  CheckinOperationPolicy,
  CustomerSchedulingPolicy,
  TaskerCancellationPolicy,
  TaskerCancelPenaltyRule,
} from "../types/system-config.types";

const DEFAULT_CANCEL_RULES: TaskerCancelPenaltyRule[] = [
  { hoursBeforeStart: 24, penaltyPercent: 0 },
  { hoursBeforeStart: 8, penaltyPercent: 50 },
  { hoursBeforeStart: 0, penaltyPercent: 100 },
];
const DEFAULT_CHECKIN = { openBeforeMinutes: 30, autoApproveRadiusMeters: 50 };
const DEFAULT_SCHEDULING = { minAdvanceMinutes: 60, maxAdvanceDays: 30 };

function numberValue(value: string): number {
  return value === "" ? 0 : Number(value);
}

function TaskerCancellationCard({
  policy,
}: {
  policy: TaskerCancellationPolicy;
}) {
  const update = useUpdateTaskerCancellationPolicy();
  const [rules, setRules] = useState(() => policy.rules);
  const [previewPrice, setPreviewPrice] = useState(1_000_000);
  const [previewHours, setPreviewHours] = useState(12);

  const sortedRules = useMemo(
    () =>
      [...rules].sort(
        (left, right) => right.hoursBeforeStart - left.hoursBeforeStart,
      ),
    [rules],
  );
  const matchedRule =
    sortedRules.find((rule) => previewHours >= rule.hoursBeforeStart) ??
    sortedRules.at(-1);
  const previewFee = Math.round(
    (Math.max(previewPrice, 0) * (matchedRule?.penaltyPercent ?? 0)) / 100,
  );

  const updateRule = (
    index: number,
    patch: Partial<TaskerCancelPenaltyRule>,
  ) => {
    setRules((current) =>
      current.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    );
  };

  const save = () => {
    update.mutate({ rules });
  };

  return (
    <Card className="rounded-[2rem] border-[var(--c-line)] bg-[var(--c-card)] p-4 shadow-xl shadow-primary/5 sm:p-6">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Percent className="size-5 text-red-500" /> Phí hủy Tasker
        </CardTitle>
        <CardDescription>
          Phí phạt tasker hủy đơn sát giờ.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-0">
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div
              key={`${index}-${rule.hoursBeforeStart}`}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3"
            >
              <label className="space-y-1 text-[10px] font-bold uppercase text-[var(--c-muted)]">
                Hủy trước (giờ)
                <Input
                  type="number"
                  min={0}
                  max={720}
                  value={rule.hoursBeforeStart}
                  onChange={(event) =>
                    updateRule(index, {
                      hoursBeforeStart: numberValue(event.target.value),
                    })
                  }
                  className="mt-1 rounded-xl bg-[var(--c-card)]"
                />
              </label>
              <label className="space-y-1 text-[10px] font-bold uppercase text-[var(--c-muted)]">
                Phạt (%)
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={rule.penaltyPercent}
                  onChange={(event) =>
                    updateRule(index, {
                      penaltyPercent: numberValue(event.target.value),
                    })
                  }
                  className="mt-1 rounded-xl bg-[var(--c-card)]"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={rules.length === 1 || update.isPending}
                onClick={() =>
                  setRules((current) =>
                    current.filter((_, ruleIndex) => ruleIndex !== index),
                  )
                }
                aria-label="Xóa mốc phí hủy"
              >
                <Trash2 className="size-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={rules.length >= 8 || update.isPending}
            onClick={() =>
              setRules((current) => {
                const usedThresholds = new Set(
                  current.map((rule) => rule.hoursBeforeStart),
                );
                const nextThreshold = Array.from(
                  { length: 721 },
                  (_, index) => 720 - index,
                ).find((threshold) => !usedThresholds.has(threshold));
                if (nextThreshold === undefined) return current;
                const inheritedPercent = [...current]
                  .sort(
                    (left, right) =>
                      right.hoursBeforeStart - left.hoursBeforeStart,
                  )
                  .find(
                    (rule) => nextThreshold >= rule.hoursBeforeStart,
                  )?.penaltyPercent;
                return [
                  ...current,
                  {
                    hoursBeforeStart: nextThreshold,
                    penaltyPercent: inheritedPercent ?? 0,
                  },
                ];
              })
            }
            className="w-full rounded-xl border-dashed"
          >
            <Plus className="size-4" /> Thêm mốc
          </Button>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
            Xem trước phí phạt
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[10px] font-bold uppercase text-amber-700">
              Giá trị đơn
              <Input
                type="number"
                min={0}
                value={previewPrice}
                onChange={(event) =>
                  setPreviewPrice(numberValue(event.target.value))
                }
                className="mt-1 bg-white"
              />
            </label>
            <label className="text-[10px] font-bold uppercase text-amber-700">
              Hủy trước (giờ)
              <Input
                type="number"
                min={0}
                value={previewHours}
                onChange={(event) =>
                  setPreviewHours(numberValue(event.target.value))
                }
                className="mt-1 bg-white"
              />
            </label>
          </div>
          <p className="mt-3 text-sm font-semibold text-amber-800">
            Phí phạt dự kiến:{" "}
            <span className="font-black">
              {previewFee.toLocaleString("vi-VN")}đ
            </span>{" "}
            ({matchedRule?.penaltyPercent ?? 0}%)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={update.isPending}
            onClick={() => setRules(DEFAULT_CANCEL_RULES)}
            className="flex-1 rounded-xl"
          >
            <RotateCcw className="size-4" /> Mặc định
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                disabled={update.isPending}
                className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                {update.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}{" "}
                Lưu policy
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Xác nhận thay đổi phí hủy Tasker?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Policy mới có hiệu lực ngay. Tasker đang mở màn hình hủy sẽ
                  phải tải lại nếu version đã thay đổi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Quay lại</AlertDialogCancel>
                <AlertDialogAction
                  onClick={save}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Xác nhận lưu
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckinPolicyCard({ policy }: { policy: CheckinOperationPolicy }) {
  const update = useUpdateCheckinOperationPolicy();
  const [values, setValues] = useState(() => ({
    openBeforeMinutes: policy.openBeforeMinutes,
    autoApproveRadiusMeters: policy.autoApproveRadiusMeters,
  }));
  const save = () => update.mutate(values);
  return (
    <Card className="rounded-[2rem] border-[var(--c-line)] bg-[var(--c-card)] p-4 shadow-xl shadow-primary/5 sm:p-6">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <MapPin className="size-5 text-blue-500" /> Check-in
        </CardTitle>
        <CardDescription>
          Quy định check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-0">
        <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-[var(--c-muted)]">
          <span className="block">Mở check-in sớm (phút)</span>
          <Input
            type="number"
            min={0}
            max={1440}
            value={values.openBeforeMinutes}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                openBeforeMinutes: numberValue(event.target.value),
              }))
            }
            className="mt-2 rounded-xl bg-[var(--c-card-2)]"
          />
        </label>
        <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-[var(--c-muted)]">
          <span className="block">Bán kính tự duyệt (mét)</span>
          <Input
            type="number"
            min={10}
            max={1000}
            value={values.autoApproveRadiusMeters}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                autoApproveRadiusMeters: numberValue(event.target.value),
              }))
            }
            className="mt-2 rounded-xl bg-[var(--c-card-2)]"
          />
        </label>
        <p className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
          Ngoài bán kính sẽ yêu cầu minh chứng check-in.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setValues(DEFAULT_CHECKIN)}
            className="flex-1 rounded-xl"
          >
            <RotateCcw className="size-4" /> Mặc định
          </Button>
          <Button
            type="button"
            disabled={update.isPending}
            onClick={save}
            className="flex-1 rounded-xl"
          >
            <Save className="size-4" /> Lưu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerSchedulingCard({
  policy,
}: {
  policy: CustomerSchedulingPolicy;
}) {
  const update = useUpdateCustomerSchedulingPolicy();
  const [values, setValues] = useState(() => ({
    minAdvanceMinutes: policy.minAdvanceMinutes,
    maxAdvanceDays: policy.maxAdvanceDays,
  }));
  const save = () => update.mutate(values);
  return (
    <Card className="rounded-[2rem] border-[var(--c-line)] bg-[var(--c-card)] p-4 shadow-xl shadow-primary/5 sm:p-6">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <CalendarClock className="size-5 text-emerald-500" /> Đặt lịch khách
        </CardTitle>
        <CardDescription>
          Cấu hình đặt lịch khách
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-0">
        <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-[var(--c-muted)]">
          <span className="block">
            <Clock className="mr-1 inline size-3.5" /> Đặt trước tối thiểu
            (phút)
          </span>
          <Input
            type="number"
            min={0}
            max={10080}
            value={values.minAdvanceMinutes}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                minAdvanceMinutes: numberValue(event.target.value),
              }))
            }
            className="mt-2 rounded-xl bg-[var(--c-card-2)]"
          />
        </label>
        <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-[var(--c-muted)]">
          <span className="block">Đặt xa tối đa (ngày)</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={values.maxAdvanceDays}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                maxAdvanceDays: numberValue(event.target.value),
              }))
            }
            className="mt-2 rounded-xl bg-[var(--c-card-2)]"
          />
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setValues(DEFAULT_SCHEDULING)}
            className="flex-1 rounded-xl"
          >
            <RotateCcw className="size-4" /> Mặc định
          </Button>
          <Button
            type="button"
            disabled={update.isPending}
            onClick={save}
            className="flex-1 rounded-xl"
          >
            <Save className="size-4" /> Lưu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function OperationalPolicyCards() {
  const { data, isLoading, isError } = useOperationalPolicies();

  if (isLoading) {
    return (
      <div className="col-span-full flex min-h-40 items-center justify-center rounded-[2rem] border border-[var(--c-line)] bg-[var(--c-card)]">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="col-span-full rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        Không thể tải policy vận hành. Các thay đổi chưa được thực hiện.
      </div>
    );
  }

  return (
    <>
      <TaskerCancellationCard
        key={`tasker-cancellation-${data.taskerCancellation.version}`}
        policy={data.taskerCancellation}
      />
      <div className="space-y-6">
        <CheckinPolicyCard
          key={`checkin-${data.checkin.version}`}
          policy={data.checkin}
        />
        <CustomerSchedulingCard
          key={`customer-scheduling-${data.customerScheduling.version}`}
          policy={data.customerScheduling}
        />
      </div>
    </>
  );
}
