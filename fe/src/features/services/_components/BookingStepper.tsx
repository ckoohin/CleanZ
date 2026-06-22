"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, PackageOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ServiceItem } from "@/features/services/types/service.type";
import { usePublicServices } from "../hooks/usePublicServices";

interface BookingStepperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceItem | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export function BookingStepper({
  open,
  onOpenChange,
  service,
}: BookingStepperProps) {
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const { data, isLoading, isError, refetch } = usePublicServices();
  const services = data?.data ?? [];
  const requestedId = service ? String(service.id) : "";
  const effectiveServiceId =
    services.find((item) => item.id === selectedServiceId)?.id ??
    services.find((item) => item.id === requestedId)?.id ??
    services[0]?.id ??
    "";

  const continueBooking = () => {
    if (!effectiveServiceId) return;
    onOpenChange(false);
    router.push(
      `/customer/booking?serviceId=${encodeURIComponent(effectiveServiceId)}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/50 px-6 py-5">
          <DialogTitle>Đặt dịch vụ</DialogTitle>
          <DialogDescription>
            Chọn gói dịch vụ phù hợp để bắt đầu đặt lịch.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Đang tải danh sách dịch vụ...
              </p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <PackageOpen className="size-9 text-muted-foreground/50" />
              <div>
                <p className="font-bold">Không thể tải dịch vụ</p>
                <p className="text-sm text-muted-foreground">
                  Vui lòng thử lại sau ít phút.
                </p>
              </div>
              <Button variant="outline" onClick={() => void refetch()}>
                Thử lại
              </Button>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <PackageOpen className="size-9 text-muted-foreground/50" />
              <p className="font-bold">Chưa có dịch vụ khả dụng</p>
              <p className="text-sm text-muted-foreground">
                Hệ thống chưa mở gói dịch vụ để đặt lịch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((item) => {
                const selected = item.id === effectiveServiceId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedServiceId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground">{item.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {item.shortDescription ||
                            item.description ||
                            "Dịch vụ vệ sinh theo yêu cầu của bạn."}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle2 className="size-5 shrink-0 text-primary" />
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {item.baseDurationHours} giờ
                      </span>
                      <span className="font-black text-primary">
                        {formatCurrency(item.pricing.basePrice)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border/50 px-6 py-4">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            className="rounded-xl"
            disabled={!effectiveServiceId || isLoading}
            onClick={continueBooking}
          >
            Tiếp tục
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
