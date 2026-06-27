"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
import { useAdminServices } from "@/features/admin/modules/service/hooks/useAdminServices";

const createBookingSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng"),
  serviceId: z.string().min(1, "Vui lòng chọn dịch vụ"),
  addressId: z.string().optional(),
  scheduledDate: z.date(),
  scheduledTime: z.string().min(1, "Vui lòng chọn giờ làm việc (VD: 09:00)"),
  paymentMethod: z.string().min(1, "Vui lòng chọn phương thức thanh toán"),
  voucherCode: z.string().optional(),
  reason: z.string().min(5, "Vui lòng nhập lý do tạo hộ (tối thiểu 5 ký tự)"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof createBookingSchema>;

interface AdminCreateBookingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCreateBookingDrawer({ open, onOpenChange }: AdminCreateBookingDrawerProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  
  // Queries
  const { data: servicesData } = useAdminServices({ limit: 100 });
  const { data: customersData, isLoading: isLoadingCustomers } = useAdminCustomers({ keyword: customerSearch, limit: 10 });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customerId: "",
      serviceId: "",
      addressId: "",
      scheduledTime: "08:00",
      paymentMethod: "CASH",
      voucherCode: "",
      reason: "",
      note: "",
    },
  });

  const selectedCustomerId = form.watch("customerId");
  const { data: customerDetail, isLoading: isLoadingDetail } = useAdminCustomerDetail(selectedCustomerId || "");

  const createMutation = useCreateAdminBooking();

  const onSubmit = (values: FormValues) => {
    const formattedDate = format(values.scheduledDate, "yyyy-MM-dd");
    
    createMutation.mutate({
      ...values,
      scheduledDate: formattedDate,
    }, {
      onSuccess: () => {
        toast.success("Tạo booking thủ công thành công");
        form.reset();
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi tạo booking");
      }
    });
  };

  const services = servicesData?.items || [];
  const customers = customersData?.data || [];
  const addresses = customerDetail?.addresses || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="cz-admin w-full sm:max-w-xl overflow-y-auto p-6 bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
        <SheetHeader className="mb-6 p-0">
          <SheetTitle className="text-[var(--c-ink)]">Tạo Đơn Hộ Khách Hàng</SheetTitle>
          <SheetDescription className="text-[var(--c-muted)]">
            Điền thông tin để tạo booking thủ công. Giá tiền sẽ được tự động tính theo cấu hình hiện hành.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Customer Select */}
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
                          className={cn(
                            "w-full justify-between bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]",
                            !field.value && "text-[var(--c-muted)]"
                          )}
                        >
                          {field.value
                            ? customers.find((c: { id: string; fullName: string }) => c.id === field.value)?.fullName || "Đã chọn khách hàng"
                            : "Tìm kiếm tên hoặc SĐT..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="cz-admin w-[400px] p-0 bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
                      <Command className="bg-transparent text-[var(--c-ink)]">
                        <CommandInput 
                          placeholder="Nhập tên hoặc số điện thoại..." 
                          value={customerSearch}
                          onValueChange={setCustomerSearch}
                        />
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
                                  form.setValue("addressId", ""); // Reset address when customer changes
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    c.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {c.fullName} - {c.phone}
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

            {/* Address Select */}
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
                          <SelectValue placeholder={isLoadingDetail ? "Đang tải địa chỉ..." : "Chọn địa chỉ (mặc định lấy địa chỉ chính)"} />
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

            {/* Service Select */}
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dịch vụ *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
                        <SelectValue placeholder="Chọn dịch vụ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
                      {services.map((s: { id: string; name: string }) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time */}
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
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]",
                              !field.value && "text-[var(--c-muted)]"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Chọn ngày</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="cz-admin w-auto p-0 bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
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
                    <FormControl>
                      <Input type="time" className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phương thức thanh toán *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
                        <SelectValue placeholder="Chọn phương thức" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
                      <SelectItem value="CASH">Tiền mặt (CASH)</SelectItem>
                      <SelectItem value="VNPAY">VNPAY</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lý do tạo hộ *</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Tạo hộ khách hàng qua tổng đài" className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]" {...field} />
                  </FormControl>
                  <FormDescription>Lý do sẽ được ghi vào lịch sử (audit log).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ghi chú thêm cho Tasker..." className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 border-t border-[var(--c-line)]">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-3 bg-[var(--c-card)] border-[var(--c-line-strong)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]">
                Hủy
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="text-white" style={{ background: "linear-gradient(180deg,#FFB300,#FF8F00)" }}>
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
