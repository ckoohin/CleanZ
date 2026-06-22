"use client";

import { useState } from "react";
import { Briefcase, Home, MapPin, Plus, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useCustomerAddresses,
  useSetDefaultCustomerAddress,
} from "../hooks/useCustomerAddresses";
import { CustomerAddressDialog } from "./CustomerAddressDialog";

export const AddressManager = () => {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: addresses = [], isLoading, isError } = useCustomerAddresses();
  const setDefaultAddress = useSetDefaultCustomerAddress();

  return (
    <div className="relative min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 flex items-center bg-card px-4 py-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="-ml-2 rounded-full p-2 hover:bg-muted"
          aria-label="Quay lại"
        >
          <X className="size-6 text-foreground/90" />
        </button>
        <h1 className="ml-2 text-lg font-bold text-foreground">Sổ địa chỉ</h1>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Button
          variant="outline"
          onClick={() => setIsAddOpen(true)}
          className="h-auto w-full gap-2 rounded-2xl border-2 border-dashed border-primary/30 py-4 font-bold text-primary hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="size-5" />
          Thêm địa chỉ mới
        </Button>

        {isLoading &&
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}

        {isError && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Không thể tải danh sách địa chỉ. Vui lòng thử lại.
          </div>
        )}

        {!isLoading && !isError && addresses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <MapPin className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">
              Bạn chưa có địa chỉ đã lưu
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thêm địa chỉ để bắt đầu đặt dịch vụ.
            </p>
          </div>
        )}

        {addresses.map((address) => {
          const normalizedLabel = address.label?.toLowerCase() ?? "";
          const AddressIcon = normalizedLabel.includes("nhà")
            ? Home
            : normalizedLabel.includes("công") ||
                normalizedLabel.includes("văn phòng")
              ? Briefcase
              : MapPin;

          return (
            <div
              key={address.id}
              className={cn(
                "relative flex gap-4 overflow-hidden rounded-2xl border bg-card p-5 shadow-sm",
                address.isDefault
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60",
              )}
            >
              {address.isDefault && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                  MẶC ĐỊNH
                </div>
              )}

              <div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <AddressIcon className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 pr-16">
                  <h3 className="font-bold text-foreground">
                    {address.label || "Địa chỉ"}
                  </h3>
                  {address.hasPet && (
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] text-orange-600">
                      Có thú cưng
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {address.fullAddress}
                </p>

                {!address.isDefault && (
                  <div className="mt-4 border-t border-border/50 pt-3">
                    <button
                      onClick={() => setDefaultAddress.mutate(address.id)}
                      disabled={setDefaultAddress.isPending}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-50"
                    >
                      <Star className="size-3.5" />
                      Chọn mặc định
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CustomerAddressDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />
    </div>
  );
};
