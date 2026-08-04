import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookingFormState } from "@/features/booking/types/booking.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Banknote, ShieldCheck, CheckCircle2, Ticket, Loader2, Wallet, AlertCircle, Phone, User } from "lucide-react";
import { useBookingQuote, useCreateBooking } from "@/features/booking/hooks/useCustomerBooking";
import { useCustomerWallet } from "@/features/customer/wallet/hooks/useCustomerWallet";
import { TopupDialog } from "@/features/customer/wallet/components/TopupDialog";
import { useRouter } from "next/navigation";
import { PublicService } from "@/features/public/hooks/usePublicData";
import { toast } from "@/lib/toast";
import { useProfile, useUpdateProfile } from "@/features/auth/hooks/auth.hooks";
import { EditProfileDialog } from "@/features/customer/profile/components/EditProfileDialog";
import { ServiceTierSelector } from "./ServiceTierSelector";

interface StepCheckoutProps {
  formData: BookingFormState;
  updateForm: (data: Partial<BookingFormState>) => void;
  onBack: () => void;
  serviceDetail?: PublicService | null;
  onGoToStep?: (step: number) => void;
}

export const StepCheckout: React.FC<StepCheckoutProps> = ({ formData, updateForm, onBack, serviceDetail, onGoToStep }) => {
  const router = useRouter();
  const quoteMutation = useBookingQuote();
  const createMutation = useCreateBooking();
  const { data: wallet, isLoading: isWalletLoading } = useCustomerWallet();
  const [voucherInput, setVoucherInput] = useState(formData.voucherCode ?? "");
  const [topupOpen, setTopupOpen] = useState(false);

  const [inputPhone, setInputPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const updateProfileMutation = useUpdateProfile();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      quoteMutation.mutate({
        packageId: formData.serviceId || undefined,
        subServiceIds: formData.subServiceIds && formData.subServiceIds.length > 0
          ? formData.subServiceIds
          : undefined,
        addressId: formData.addressId || undefined,
        address: formData.address,
        provinceCode: formData.provinceCode,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        voucherCode: formData.voucherCode || undefined,
        serviceTier: formData.serviceTier,
      });
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.serviceId, 
    formData.addressId,
    formData.address, 
    formData.provinceCode, 
    formData.scheduledDate, 
    formData.scheduledTime, 
    formData.voucherCode,
    formData.serviceTier
  ]);

  const handleApplyVoucher = () => {
    updateForm({ voucherCode: voucherInput.trim().toUpperCase() });
  };

  const handleUpdatePhone = () => {
    if (!inputPhone.trim()) {
      setPhoneError("Vui lòng nhập số điện thoại");
      return;
    }
    if (!/^0\d{9,10}$/.test(inputPhone.trim())) {
      setPhoneError("Số điện thoại phải từ 10-11 chữ số, bắt đầu bằng 0");
      return;
    }
    setPhoneError("");

    updateProfileMutation.mutate(
      { phone: inputPhone.trim() },
      {
        onSuccess: () => {
          toast.success("Cập nhật số điện thoại thành công!");
          quoteMutation.mutate({
            packageId: formData.serviceId || undefined,
            subServiceIds: formData.subServiceIds && formData.subServiceIds.length > 0
              ? formData.subServiceIds
              : undefined,
            addressId: formData.addressId || undefined,
            address: formData.address,
            provinceCode: formData.provinceCode,
            scheduledDate: formData.scheduledDate,
            scheduledTime: formData.scheduledTime,
            voucherCode: formData.voucherCode || undefined,
            serviceTier: formData.serviceTier,
          });
        },
      }
    );
  };

  const { data: profile } = useProfile();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const handleCheckout = () => {
    const userPhone = profile?.phone || "";
    if (!userPhone.trim()) {
      setEditProfileOpen(true);
      toast.warning("Vui lòng cập nhật số điện thoại trước khi đặt booking!");
      return;
    }

    createMutation.mutate({
      packageId: formData.serviceId || undefined,
      subServiceIds: formData.subServiceIds && formData.subServiceIds.length > 0
        ? formData.subServiceIds
        : undefined,
      addressId: formData.addressId || undefined,
      address: formData.address,
      provinceCode: formData.provinceCode,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      note: formData.note,
      paymentMethod: formData.paymentMethod,
      voucherCode: formData.voucherCode || undefined,
      serviceTier: formData.serviceTier,
      preferredTaskerId: formData.preferredTaskerId,
      contactPhone: formData.contactPhone?.trim() || undefined,
    }, {
      onSuccess: (data) => {
        toast.success("Đặt lịch thành công!");
        router.push(`/customer/booking/${data.id}`);
      }
    });
  };

  const formatVND = (n: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
  };

  const isQuoting = quoteMutation.isPending;
  const quoteData = quoteMutation.data;
  const isCreating = createMutation.isPending;

  // Tính toán kiểm tra số dư ví
  const walletBalance = wallet?.balance ?? 0;
  const totalPrice = quoteData?.price?.totalPrice ?? 0;
  const isUsingWallet = formData.paymentMethod === "WALLET";
  const isWalletInsufficient = isUsingWallet && walletBalance < totalPrice;
  const missingAmount = Math.max(0, totalPrice - walletBalance);
  // Làm tròn lên bội số 10k cho gọn số tiền khách phải nạp.
  const suggestedTopup = Math.ceil(missingAmount / 10_000) * 10_000;

  const isSubmitDisabled = isCreating || isQuoting || !quoteData || isWalletInsufficient;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="text-center md:text-left">
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Thanh toán & Xác nhận</h2>
        <p className="text-muted-foreground text-sm">Kiểm tra lại thông tin chi tiết và tiến hành hoàn tất đặt lịch.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 items-stretch">
        {/* Cột trái - Thông tin tóm tắt & Phương thức thanh toán */}
        <div className="space-y-6 md:w-1/2 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Tóm tắt đơn hàng */}
            <div className="bg-muted/30 border border-border/40 rounded-3xl p-5 space-y-3.5 shadow-sm">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 uppercase tracking-wider text-primary/95">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" /> Tóm tắt dịch vụ
              </h3>
              <div className="space-y-2.5 text-sm font-semibold text-foreground/80">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground font-medium shrink-0">Dịch vụ:</span>
                  <span className="text-right truncate max-w-55">{serviceDetail?.name || "Dịch vụ vệ sinh CleanZ"}</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground font-medium shrink-0">Thời gian:</span>
                  <span className="text-right text-primary">{formData.scheduledTime} ngày {formData.scheduledDate}</span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span className="text-muted-foreground font-medium shrink-0 mt-0.5">Địa chỉ:</span>
                  <span className="text-right text-foreground/90 font-bold leading-snug truncate-2-lines max-w-55">{formData.address}</span>
                </div>
              </div>
            </div>

            {/* Chọn hạng dịch vụ (Tiêu chuẩn / Cao cấp) */}
            <ServiceTierSelector
              value={formData.serviceTier ?? "STANDARD"}
              onChange={(serviceTier) => updateForm({ serviceTier })}
              preferredTaskerId={formData.preferredTaskerId}
              onPreferredTaskerChange={(preferredTaskerId) =>
                updateForm({ preferredTaskerId })
              }
              premiumFee={quoteData?.price?.premiumFee}
              isQuoting={isQuoting}
              scheduledDate={formData.scheduledDate}
              scheduledTime={formData.scheduledTime}
              durationHours={
                quoteData?.schedule?.durationHours ?? formData.durationHours
              }
            />

            {/* SĐT người liên hệ tại chỗ - Premium Synchronized Design */}
            <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/60 p-4 sm:p-5 space-y-3.5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground tracking-tight truncate">SĐT người liên hệ</h3>
                    <p className="text-[11px] text-muted-foreground truncate">Tasker sẽ gọi SĐT này khi tới làm việc</p>
                  </div>
                </div>
                {formData.contactPhone ? (
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full border border-amber-200/60 flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <Phone className="w-3 h-3" /> SĐT khác
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <ShieldCheck className="w-3 h-3" /> SĐT cá nhân
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Option 1: Profile Phone */}
                <button
                  type="button"
                  onClick={() => updateForm({ contactPhone: undefined })}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between ${
                    !formData.contactPhone
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/60 bg-background hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">SĐT tài khoản cá nhân</p>
                    <p className="text-xs font-semibold text-primary">{profile?.phone || "Chưa thiết lập"}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    !formData.contactPhone ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                  }`}>
                    {!formData.contactPhone && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* Option 2: Custom Contact Phone */}
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.contactPhone) {
                      updateForm({ contactPhone: profile?.phone || "" });
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between ${
                    formData.contactPhone !== undefined
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/60 bg-background hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Dùng SĐT liên hệ khác</p>
                    <p className="text-xs text-muted-foreground">Sử dụng SĐT khác cho đơn này</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    formData.contactPhone !== undefined ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                  }`}>
                    {formData.contactPhone !== undefined && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </button>
              </div>

              {typeof formData.contactPhone === "string" && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pt-1"
                >
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Nhập SĐT liên hệ tại chỗ (VD: 0912345678)"
                      value={formData.contactPhone}
                      onChange={(e) => updateForm({ contactPhone: e.target.value })}
                      className="h-12 pl-10 rounded-2xl border-primary/40 bg-background text-sm font-semibold focus-visible:ring-primary shadow-xs"
                    />
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1 pl-1">
                    <span>💡</span> Tasker sẽ gọi SĐT này khi tới làm việc tại địa chỉ.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Chọn phương thức thanh toán */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-primary" />
                Phương thức thanh toán
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* 1. Tiền mặt */}
                <button
                  type="button"
                  onClick={() => updateForm({ paymentMethod: "CASH" })}
                  className={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 font-bold text-[10px] sm:text-xs transition-all duration-300 active:scale-95
                    ${formData.paymentMethod === "CASH" 
                      ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10" 
                      : "border-border/50 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground/90"}
                  `}
                >
                  <Banknote className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold">Tiền mặt</span>
                </button>

                {/* 2. Ví CleanZ */}
                <button
                  type="button"
                  onClick={() => updateForm({ paymentMethod: "WALLET" })}
                  className={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 font-bold text-[10px] sm:text-xs transition-all duration-300 active:scale-95 relative
                    ${formData.paymentMethod === "WALLET" 
                      ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10" 
                      : "border-border/50 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground/90"}
                  `}
                >
                  <Wallet className="w-5 h-5 shrink-0" />
                  <span className="leading-none text-[10px] sm:text-xs font-bold">Ví CleanZ</span>
                  {isWalletLoading ? (
                    <span className="text-[9px] font-medium animate-pulse bg-muted-foreground/20 h-3 w-12 rounded"></span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground font-medium truncate max-w-[90%]">
                      {formatVND(walletBalance)}
                    </span>
                  )}
                </button>

              </div>
            </div>
          </div>

          {/* Hiển thị cảnh báo số dư ví không đủ */}
          {isWalletInsufficient && (
            <div className="p-4 bg-destructive/5 dark:bg-destructive/10 border border-destructive/20 rounded-2xl text-xs font-semibold text-destructive leading-relaxed flex items-start gap-2.5 mt-4 shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Số dư Ví không đủ thanh toán</p>
                <p className="text-[11px] text-destructive/90 mt-0.5">
                  Bạn đang thiếu {formatVND(missingAmount)}. Nạp thêm để trả bằng ví, hoặc chọn Tiền mặt.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setTopupOpen(true)}
                  className="mt-3 h-8 rounded-xl text-[11px] font-bold"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Nạp {formatVND(suggestedTopup)} vào ví
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Cột phải - Chi tiết hóa đơn chi phí & Voucher */}
        <div className="md:w-1/2 flex flex-col">
          <div className="bg-muted/30 border border-border/50 rounded-3xl p-6 flex flex-col flex-1 shadow-sm">
            <h3 className="font-extrabold text-base mb-4 flex items-center gap-2 tracking-tight">
              <Ticket className="w-5 h-5 text-primary" /> Chi tiết chi phí
            </h3>

            {/* Khối Voucher */}
            <div className="flex gap-2 mb-6">
              <Input 
                placeholder="Mã giảm giá (ví dụ: CLEAN30)..." 
                className="bg-background h-12 rounded-2xl border-border/50 font-semibold focus-visible:ring-primary/20 text-sm"
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value)}
              />
              <Button variant="secondary" className="h-12 px-5 rounded-2xl font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-xs" onClick={handleApplyVoucher}>
                Áp dụng
              </Button>
            </div>

            {/* Báo giá hóa đơn chi tiết */}
            {isQuoting ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2.5" />
                <p className="text-xs font-bold text-muted-foreground animate-pulse">Đang liên hệ máy chủ tính giá...</p>
              </div>

            ) : quoteMutation.isError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-destructive/5 dark:bg-destructive/10 border border-destructive/20 rounded-3xl text-center shadow-sm">
                <AlertCircle className="w-9 h-9 text-destructive mb-3" />
                <h4 className="font-extrabold text-sm text-foreground mb-1">Không thể lấy báo giá</h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-65 mb-4">
                  {(() => {
                    const quoteError = quoteMutation.error as { response?: { data?: { message?: string } } } | null;
                    return quoteError?.response?.data?.message || "Không thể lấy báo giá từ hệ thống. Vui lòng thử lại.";
                  })()}
                </p>
                {(() => {
                  const quoteError = quoteMutation.error as { response?: { data?: { message?: string } } } | null;
                  const errMsg = (quoteError?.response?.data?.message || "").toLowerCase();
                  const isPhoneErr = errMsg.includes("số điện thoại") || errMsg.includes("phone");
                  const isAddressErr = errMsg.includes("địa chỉ") || errMsg.includes("address");

                  if (isPhoneErr) {
                    return (
                      <Button
                        onClick={() => setEditProfileOpen(true)}
                        className="mt-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-primary/20"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Cập nhật số điện thoại ngay</span>
                      </Button>
                    );
                  }
                  if (isAddressErr) {
                    return (
                      <Button
                        onClick={() => onGoToStep && onGoToStep(0)}
                        className="h-10 px-4 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                      >
                        <span>Quay lại thêm địa chỉ</span>
                      </Button>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : quoteData ? (
              <div className="flex-1 space-y-3.5">
                <div className="flex justify-between text-sm font-semibold text-foreground/80">
                  <span className="text-muted-foreground font-medium">Giá cước cơ bản</span>
                  <span>{formatVND(quoteData.price.subtotal || quoteData.price.basePrice || 0)}</span>
                </div>
                {(quoteData.price.premiumFee ?? 0) > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground font-medium">
                      Phụ trội gói Cao cấp 👑
                      <span className="block text-[11px] font-normal text-muted-foreground/80">
                        Đã tính trong giá cước cơ bản
                      </span>
                    </span>
                    <span className="text-amber-600 font-bold">
                      {formatVND(quoteData.price.premiumFee ?? 0)}
                    </span>
                  </div>
                )}
                {quoteData.price.peakFee > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground font-medium">Phụ phí giờ cao điểm</span>
                    <span className="text-amber-600 font-bold">+{formatVND(quoteData.price.peakFee)}</span>
                  </div>
                )}
                {quoteData.price.petFee > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground font-medium">Phụ phí nhà có thú cưng 🐾</span>
                    <span className="text-orange-600 font-bold">+{formatVND(quoteData.price.petFee)}</span>
                  </div>
                )}
                {quoteData.price.discountAmount > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-emerald-600">
                    <span>Khuyến mãi voucher</span>
                    <span className="font-extrabold">-{formatVND(quoteData.price.discountAmount)}</span>
                  </div>
                )}
                <Separator className="my-4 bg-border/50" />
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-base">Tổng số tiền</span>
                  <span className="text-2xl font-black text-primary tracking-tight">
                    {formatVND(quoteData.price.totalPrice)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8 bg-background/50 rounded-2xl border border-dashed border-border/40">
                <AlertCircle className="w-6 h-6 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">Vui lòng đợi giây lát để tải báo giá...</p>
              </div>
            )}

            {/* Nút thanh toán */}
            <div className="mt-6 pt-4 border-t border-border/30 space-y-3.5">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground mb-4 select-none">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                Bảo mật thông tin & Thanh toán an toàn 100%
              </div>
              <Button 
                onClick={handleCheckout}
                disabled={isSubmitDisabled}
                className="w-full h-14 rounded-2xl bg-linear-to-r from-primary to-amber-500 hover:opacity-95 text-primary-foreground font-black shadow-lg shadow-primary/20 text-base active:scale-98 transition-all disabled:opacity-40"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang tạo đơn hàng...</span>
                  </div>
                ) : (
                  `Đặt lịch ngay`
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={onBack}
                className="w-full h-14 rounded-2xl border border-border/60 font-bold hover:bg-muted text-foreground/90 active:scale-95 transition-all md:hidden flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại bước trước
              </Button>
            </div>
          </div>
        </div>
      </div>

      <TopupDialog
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
        defaultAmountVnd={suggestedTopup}
      />

      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        profile={profile}
        onSuccess={() => {
          quoteMutation.mutate({
            packageId: formData.serviceId || undefined,
            subServiceIds: formData.subServiceIds && formData.subServiceIds.length > 0
              ? formData.subServiceIds
              : undefined,
            addressId: formData.addressId || undefined,
            address: formData.address,
            provinceCode: formData.provinceCode,
            scheduledDate: formData.scheduledDate,
            scheduledTime: formData.scheduledTime,
            voucherCode: formData.voucherCode || undefined,
            serviceTier: formData.serviceTier,
          });
        }}
      />
    </div>
  );
};
