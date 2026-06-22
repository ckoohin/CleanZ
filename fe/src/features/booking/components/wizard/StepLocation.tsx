import React, { useState, useEffect } from "react";
import { BookingFormState } from "@/features/booking/types/booking.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ArrowRight, AlertCircle, Loader2, Plus, Home, Briefcase, Landmark } from "lucide-react";
import { useMyAddresses, useCreateAddress } from "@/features/customer/hooks/useCustomerAddress";

interface StepLocationProps {
  formData: BookingFormState;
  updateForm: (data: Partial<BookingFormState>) => void;
  onNext: () => void;
}

export const StepLocation: React.FC<StepLocationProps> = ({ formData, updateForm, onNext }) => {
  const { data: addresses, isLoading } = useMyAddresses();
  const createAddressMutation = useCreateAddress();
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");

  // State cho form địa chỉ mới
  const [newLabel, setNewLabel] = useState<string>("Nhà");
  const [newAddress, setNewAddress] = useState("");
  const [isDefault, setIsDefault] = useState(true);

  // Tự động chọn địa chỉ mặc định khi tải xong danh sách địa chỉ từ DB
  useEffect(() => {
    if (addresses && addresses.length > 0 && !formData.addressId) {
      const defAddr = addresses.find((a) => a.isDefault) || addresses[0];
      updateForm({
        addressId: defAddr.id,
        address: defAddr.fullAddress,
      });
    }
  }, [addresses, formData.addressId, updateForm]);

  const handleNext = () => {
    if (!formData.addressId && !formData.address.trim()) {
      setError("Vui lòng chọn hoặc thêm địa chỉ mới");
      return;
    }
    setError("");
    onNext();
  };

  const handleSaveNewAddress = async () => {
    if (!newAddress.trim()) {
      setError("Vui lòng nhập địa chỉ chi tiết");
      return;
    }
    setError("");

    try {
      const saved = await createAddressMutation.mutateAsync({
        label: newLabel,
        fullAddress: newAddress.trim(),
        isDefault: isDefault || (addresses ? addresses.length === 0 : true),
        hasPet: false,
      });

      if (saved && saved.id) {
        updateForm({
          addressId: saved.id,
          address: saved.fullAddress,
        });
        setShowAddForm(false);
        setNewAddress("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang tải sổ địa chỉ...</p>
      </div>
    );
  }

  const hasSavedAddresses = addresses && addresses.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Địa điểm thực hiện</h2>
        <p className="text-muted-foreground text-sm">Cho chúng tôi biết chuyên gia cần đến đâu để phục vụ bạn.</p>
      </div>

      <div className="space-y-6 flex-1">
        {hasSavedAddresses && !showAddForm ? (
          /* Chọn từ danh sách địa chỉ đã lưu */
          <div className="space-y-4">
            <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Chọn địa chỉ của bạn
            </label>

            <div className="grid grid-cols-1 gap-3">
              {addresses.map((addr) => {
                const isSelected = formData.addressId === addr.id;
                const Icon = addr.label === "Nhà" ? Home : addr.label === "Văn phòng" ? Briefcase : Landmark;
                return (
                  <button
                    type="button"
                    key={addr.id}
                    onClick={() => updateForm({ addressId: addr.id, address: addr.fullAddress })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3.5
                      \${isSelected 
                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/5" 
                        : "border-border/50 bg-card hover:border-primary/30"
                      }
                    `}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                      \${isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-foreground">{addr.label || "Khác"}</span>
                        {addr.isDefault && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">Mặc định</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed truncate">{addr.fullAddress}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(true);
                setError("");
              }}
              className="w-full h-13 rounded-xl border-dashed border-border hover:border-primary/50 text-xs font-bold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Sử dụng địa chỉ mới
            </Button>
          </div>
        ) : (
          /* Form thêm địa chỉ mới */
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Thêm địa chỉ mới
              </label>
              {hasSavedAddresses && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setError("");
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Quay lại danh sách
                </button>
              )}
            </div>

            {/* Chọn Nhãn */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground">Nhãn địa chỉ</span>
              <div className="grid grid-cols-3 gap-2">
                {["Nhà", "Văn phòng", "Khác"].map((lbl) => (
                  <button
                    type="button"
                    key={lbl}
                    onClick={() => setNewLabel(lbl)}
                    className={`h-11 rounded-lg border-2 font-bold text-xs transition-all active:scale-95
                      \${newLabel === lbl 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-border/50 bg-background text-muted-foreground hover:bg-muted/50"}
                    `}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Địa chỉ chi tiết */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground">Địa chỉ chi tiết</span>
              <Input
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                className="h-14 bg-muted/40 border-border/50 rounded-xl focus-visible:ring-primary/20 focus-visible:bg-background font-semibold transition-all duration-300"
                value={newAddress}
                onChange={(e) => {
                  setNewAddress(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>

            {/* Checkbox mặc định */}
            <div className="flex items-center gap-2.5 px-1 py-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary"
              />
              <label htmlFor="isDefault" className="text-xs font-bold text-foreground/80 cursor-pointer select-none">
                Đặt làm địa chỉ mặc định
              </label>
            </div>

            {error && (
              <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}

            <Button
              type="button"
              onClick={handleSaveNewAddress}
              disabled={createAddressMutation.isPending}
              className="w-full h-13 rounded-xl bg-primary text-primary-foreground hover:opacity-95 font-bold text-xs"
            >
              {createAddressMutation.isPending ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu địa chỉ...</span>
                </div>
              ) : (
                "Lưu địa chỉ này"
              )}
            </Button>
          </div>
        )}

        {/* Banner hỗ trợ */}
        <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/10 dark:to-amber-950/5 border border-orange-100 dark:border-orange-900/30 rounded-xl p-5 flex gap-4 mt-6 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
             <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-orange-900 dark:text-orange-400 mb-1">Hỗ trợ nhanh chóng</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Các chuyên gia trong khu vực của bạn sẽ nhận được thông báo ngay sau khi bạn đặt lịch thành công để hỗ trợ dịch vụ sớm nhất.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <Button 
          onClick={handleNext}
          disabled={showAddForm}
          className="h-14 w-full md:w-auto px-8 rounded-xl bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 text-primary-foreground font-bold shadow-lg shadow-primary/20 text-base active:scale-95 transition-all disabled:opacity-40"
        >
          Tiếp tục
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
