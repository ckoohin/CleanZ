"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/lib/toast";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Loader2, CalendarIcon, Clock, PawPrint, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/error-message";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";

import { useCreateAdminBooking } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { useAdminCustomers, useAdminCustomerDetail } from "@/features/admin/modules/customer/hooks/useAdminCustomer";
import { usePublicServices } from "@/features/services/hooks/usePublicServices";
import type { PublicService, PublicDuration, PublicPricingTier, PublicAddon } from "@/features/services/types/public-service.type";

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

const schema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng"),
  addressId: z.string().optional(),
  packageId: z.string().min(1, "Vui lòng chọn gói dịch vụ"),
  pricingTierId: z.string().optional(),
  durationHours: z.number().nullable(),
  areaM2: z.number().nullable(),
  addonIds: z.array(z.string()),
  hasPet: z.boolean(),
  scheduledDate: z.date(),
  scheduledTime: z.string().min(1, "Vui lòng chọn giờ"),
  paymentMethod: z.string().min(1, "Vui lòng chọn phương thức thanh toán"),
  voucherCode: z.string().optional(),
  reason: z.string().min(3, "Vui lòng nhập lý do (tối thiểu 3 ký tự)"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function isConfiguredAddon(a: PublicAddon) {
  return !!a.id && !!a.name?.trim() && Number.isFinite(Number(a.price)) && Number(a.price) >= 0;
}

export function AdminCreateBookingDrawer({ open, onOpenChange }: Props) {
  const [customerSearch, setCustomerSearch] = useState("");

  const { data: servicesData } = usePublicServices();
  const { data: customersData, isLoading: isLoadingCustomers } = useAdminCustomers({ keyword: customerSearch, limit: 10 });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: "",
      addressId: "",
      packageId: "",
      pricingTierId: "",
      durationHours: null,
      areaM2: null,
      addonIds: [],
      hasPet: false,
      scheduledTime: "",
      paymentMethod: "CASH",
      voucherCode: "",
      reason: "",
      note: "",
    },
  });

  const selectedCustomerId = form.watch("customerId");
  const selectedPackageId = form.watch("packageId");
  const selectedPricingTierId = form.watch("pricingTierId");
  const selectedDurationHours = form.watch("durationHours");
  const selectedAddonIds = form.watch("addonIds");
  const hasPet = form.watch("hasPet");

  const { data: customerDetail, isLoading: isLoadingDetail } = useAdminCustomerDetail(selectedCustomerId || "");
  const createMutation = useCreateAdminBooking();

  const packages: PublicService[] = servicesData?.data ?? [];
  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const durations: PublicDuration[] = selectedPackage?.durations ?? [];
  const pricingTiers: PublicPricingTier[] = selectedPackage?.pricingTiers ?? [];
  const addons: PublicAddon[] = (selectedPackage?.addons ?? []).filter(isConfiguredAddon);
  const customers = customersData?.data ?? [];
  const addresses = customerDetail?.addresses ?? [];

  const selectedTier = pricingTiers.find((t) => t.id === selectedPricingTierId);

  const handleSelectPackage = (pkg: PublicService) => {
    const defaultDuration = pkg.durations?.find((d) => d.isPopular) ?? pkg.durations?.[0];
    const defaultTier = pkg.pricingTiers?.[0];
    form.setValue("packageId", pkg.id);
    form.setValue("pricingTierId", defaultTier?.id ?? "");
    form.setValue("durationHours", defaultDuration?.durationHours ?? defaultTier?.defaultHours ?? defaultTier?.minHours ?? null);
    form.setValue("areaM2", defaultDuration?.suggestedArea ?? defaultTier?.areaMinM2 ?? null);
    form.setValue("addonIds", []);
  };

  const handleSelectDuration = (d: PublicDuration) => {
    form.setValue("durationHours", d.durationHours);
    form.setValue("areaM2", d.suggestedArea ?? null);
  };

  const handleSelectTier = (t: PublicPricingTier) => {
    form.setValue("pricingTierId", t.id);
    form.setValue("durationHours", t.defaultHours ?? t.minHours ?? selectedDurationHours);
  };

  const toggleAddon = (id: string) => {
    const current = form.getValues("addonIds");
    form.setValue("addonIds", current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      {
        ...values,
        scheduledDate: format(values.scheduledDate, "yyyy-MM-dd"),
        durationHours: values.durationHours ?? undefined,
        areaM2: values.areaM2 ?? undefined,
        addonIds: values.addonIds.length > 0 ? values.addonIds : undefined,
        pricingTierId: values.pricingTierId || undefined,
        addressId: values.addressId || undefined,
        voucherCode: values.voucherCode || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Tạo booking thủ công thành công");
          form.reset();
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Không thể tạo đơn"));
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="cz-admin w-full sm:max-w-xl overflow-y-auto p-6 bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
        <SheetHeader className="mb-6 p-0">
          <SheetTitle className="text-[var(--c-ink)]">Tạo Đơn Hộ Khách Hàng</SheetTitle>
          <SheetDescription className="text-[var(--c-muted)]">
            Chọn khách hàng, gói dịch vụ và lịch hẹn. Giá sẽ tự động tính theo cấu hình hiện hành.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Khách hàng ── */}
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Khách hàng *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]", !field.value && "text-[var(--c-muted)]")}
                        >
                          {field.value
                            ? (customers.find((c: { id: string; fullName: string }) => c.id === field.value)?.fullName ?? "Đã chọn")
                            : "Tìm kiếm tên hoặc SĐT..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="cz-admin w-[400px] p-0 bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
                      <Command className="bg-transparent text-[var(--c-ink)]">
                        <CommandInput placeholder="Nhập tên hoặc số điện thoại..." value={customerSearch} onValueChange={setCustomerSearch} />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingCustomers ? <Loader2 className="w-4 h-4 animate-spin mx-auto my-2" /> : "Không tìm thấy khách hàng."}
                          </CommandEmpty>
                          <CommandGroup>
                            {customers.map((c: { id: string; fullName: string; phone: string | null }) => (
                              <CommandItem
                                key={c.id}
                                value={c.id}
                                onSelect={() => {
                                  form.setValue("customerId", c.id);
                                  form.setValue("addressId", "");
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", c.id === field.value ? "opacity-100" : "opacity-0")} />
                                {c.fullName} — {c.phone}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Địa chỉ (khi đã chọn KH) ── */}
            {selectedCustomerId && (
              <FormField
                control={form.control}
                name="addressId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ làm việc</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
                          <SelectValue placeholder={isLoadingDetail ? "Đang tải..." : "Chọn địa chỉ (mặc định nếu bỏ qua)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
                        {addresses.map((a: { id: string; fullAddress: string; isDefault: boolean }) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.fullAddress} {a.isDefault && "(Mặc định)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* ── Chọn gói dịch vụ ── */}
            <div>
              <FormLabel>Gói dịch vụ *</FormLabel>
              <div className="mt-2 space-y-2">
                {packages.map((pkg) => {
                  const selected = selectedPackageId === pkg.id;
                  const basePrice =
                    (pkg.durations?.[0]?.durationHours ?? 0) * (pkg.baseHourlyRate ?? 0) ||
                    (pkg.pricingTiers?.[0]?.fixedPrice ?? 0);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handleSelectPackage(pkg)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selected ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)]" : "border-[var(--c-line)] hover:border-[var(--c-primary-soft)]"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-[var(--c-ink)]">{pkg.name}</p>
                          {basePrice > 0 && (
                            <p className="text-xs text-[var(--c-primary-strong)] font-bold mt-0.5">Từ {fmtCurrency(basePrice)}</p>
                          )}
                        </div>
                        {selected && <CheckCircle2 className="w-4 h-4 text-[var(--c-primary-strong)] shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {form.formState.errors.packageId && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.packageId.message}</p>
              )}
            </div>

            {/* ── Duration cards (khi package có durations) ── */}
            {selectedPackage && durations.length > 0 && (
              <div>
                <FormLabel className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Chọn gói giờ *
                </FormLabel>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {durations.map((d) => {
                    const selected = selectedDurationHours === d.durationHours;
                    const price = d.durationHours * (selectedPackage.baseHourlyRate ?? 0) * d.priceMultiplier;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDuration(d)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${selected ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)]" : "border-[var(--c-line)] hover:border-[var(--c-primary-soft)]"}`}
                      >
                        <p className="text-sm font-bold text-[var(--c-ink)]">{d.title || `${d.durationHours} giờ`}</p>
                        <p className="text-xs text-[var(--c-muted)] mt-0.5">
                          {d.durationHours}h {d.suggestedArea ? `· ${d.suggestedArea}m²` : ""}
                        </p>
                        {price > 0 && <p className="text-xs font-bold text-[var(--c-primary-strong)] mt-1">{fmtCurrency(price)}</p>}
                        {d.isPopular && (
                          <span className="inline-block mt-1 rounded-full bg-[var(--c-primary-soft)] px-2 py-0.5 text-[9px] font-black uppercase text-[var(--c-primary-strong)]">
                            Phổ biến
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Pricing tier cards (khi không có durations) ── */}
            {selectedPackage && durations.length === 0 && pricingTiers.length > 0 && (
              <div>
                <FormLabel>Gói giờ *</FormLabel>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {pricingTiers.map((t) => {
                    const selected = selectedPricingTierId === t.id;
                    const hours = t.defaultHours ?? t.minHours ?? 1;
                    const price = t.fixedPrice ?? (t.pricePerHour ? t.pricePerHour * hours : 0);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTier(t)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${selected ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)]" : "border-[var(--c-line)] hover:border-[var(--c-primary-soft)]"}`}
                      >
                        <p className="text-sm font-bold text-[var(--c-ink)]">{t.name}</p>
                        <p className="text-xs text-[var(--c-muted)] mt-0.5">{hours}h</p>
                        {price > 0 && <p className="text-xs font-bold text-[var(--c-primary-strong)] mt-1">{fmtCurrency(price)}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Area m² (khi pricing mode là AREA_HOURLY) ── */}
            {selectedTier?.pricingMode === "AREA_HOURLY" && (
              <FormField
                control={form.control}
                name="areaM2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diện tích nhà (m²)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={selectedTier.areaMinM2 ?? 1}
                        max={selectedTier.areaMaxM2 ?? undefined}
                        placeholder="Nhập diện tích"
                        className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* ── Addons ── */}
            {addons.length > 0 && (
              <div>
                <FormLabel className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Dịch vụ thêm (tùy chọn)
                </FormLabel>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {addons.map((addon) => {
                    const selected = selectedAddonIds.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => toggleAddon(addon.id)}
                        className={`rounded-xl border p-3 text-left transition-all flex items-center justify-between ${selected ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)]" : "border-[var(--c-line)] hover:border-[var(--c-primary-soft)]"}`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-[var(--c-ink)]">{addon.name}</p>
                          {addon.price > 0 && (
                            <p className="text-xs text-[var(--c-primary-strong)] font-bold mt-0.5">+{fmtCurrency(addon.price)}</p>
                          )}
                        </div>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "border-[var(--c-primary)] bg-[var(--c-primary)]" : "border-[var(--c-line-strong)]"}`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Thú cưng ── */}
            <button
              type="button"
              onClick={() => form.setValue("hasPet", !hasPet)}
              className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${hasPet ? "border-amber-400 bg-amber-50 text-amber-700" : "border-[var(--c-line)] text-[var(--c-muted)] hover:border-[var(--c-primary-soft)]"}`}
            >
              <span className="flex items-center gap-2">
                <PawPrint className="w-4 h-4" /> Nhà có thú cưng
              </span>
              <span className="text-xs font-black uppercase">{hasPet ? "Có" : "Không"}</span>
            </button>

            {/* ── Ngày & Giờ ── */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Ngày làm việc *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full pl-3 text-left font-normal bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]", !field.value && "text-[var(--c-muted)]")}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="cz-admin w-auto p-0 bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giờ làm việc *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
                          <SelectValue placeholder="Chọn giờ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Thanh toán ── */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phương thức thanh toán *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
                      <SelectItem value="CASH">💵 Tiền mặt</SelectItem>
                      <SelectItem value="WALLET">💳 Ví CleanZ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Voucher ── */}
            <FormField
              control={form.control}
              name="voucherCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã voucher (tùy chọn)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập mã voucher..."
                      className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] font-mono uppercase"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Lý do tạo hộ ── */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lý do tạo hộ *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: Tạo hộ khách hàng qua tổng đài"
                      className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Ghi vào audit log.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Ghi chú ── */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú cho Tasker (tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ghi chú thêm..."
                      className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 border-t border-[var(--c-line)] gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-[var(--c-card)] border-[var(--c-line-strong)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="text-white"
                style={{ background: "linear-gradient(180deg,#FFB300,#FF8F00)" }}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Tạo Đơn Hàng
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
