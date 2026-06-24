import React from "react";
import { DollarSign, AlertCircle, Sparkles } from "lucide-react";
import { ServiceOptionsBuilder } from "./ServiceOptionsBuilder";
import { AdminServiceEntity } from "@/features/admin/modules/service/services/admin-services.service";
import BaseEmptyState from "@/components/ui/base/base_empty_state";

interface ServicePricingTabProps {
  service: AdminServiceEntity;
}

const vnd = (val: number | string | null | undefined) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(val));
};

export function ServicePricingTab({ service }: ServicePricingTabProps) {
  const config = service.pricingConfig;

  return (
    <div className="space-y-8 animate-in fade-in-50">
      <div>
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" />
          Bảng giá dịch vụ
        </h3>
        <p className="text-muted-foreground mt-1">
          Hiển thị cấu hình giá đã được chọn cho dịch vụ này. Để thay đổi bảng giá, vui lòng vào tab Thông tin chung.
        </p>
      </div>

      {!config ? (
        <div className="py-12 border border-dashed border-border rounded-2xl bg-muted/10">
          <BaseEmptyState
            title="Chưa chọn bảng giá"
            description="Dịch vụ này chưa được liên kết với bất kỳ bảng giá nào. Bạn có thể thiết lập ở màn hình chỉnh sửa."
            icon={AlertCircle}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Tên bảng giá</p>
            <p className="text-lg font-bold text-foreground">{config.name}</p>
          </div>
          
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Giá cơ bản</p>
            <p className="text-xl font-bold text-primary">{vnd(config.basePrice)}</p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Giá cao điểm</p>
            <p className="text-lg font-bold text-amber-500">{vnd(config.peakPrice)}</p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Phí thú cưng</p>
            <p className="text-lg font-bold text-foreground">{vnd(config.petFee)}</p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Phí chờ</p>
            <p className="text-lg font-bold text-foreground">{vnd(config.waitingFee)}</p>
          </div>
        </div>
      )}

      {/* OPTIONS BUILDER */}
      <div className="mt-12 pt-8 border-t border-border/50">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Tuỳ chọn thêm (Options)
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Thiết lập các tuỳ chọn mở rộng riêng cho dịch vụ này (VD: thêm phòng, làm sạch đệm...).
            </p>
          </div>
        </div>
        <ServiceOptionsBuilder service={service} />
      </div>
    </div>
  );
}
