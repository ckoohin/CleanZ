import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { BaseButton } from "@/components/ui/base/base_button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useCreatePeakDay, useUpdatePeakDay } from "@/features/admin/hooks/useAdminPricing";
import { PeakDayConfigEntity } from "@/features/admin/services/admin-pricing.service";

const peakDaySchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên cấu hình"),
  startAt: z.date().optional().nullable(),
  endAt: z.date().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  peakRate: z.number().min(0.01, "Tỉ lệ phụ thu phải lớn hơn 0").max(10, "Tỉ lệ quá lớn"),
  isActive: z.boolean(),
});

type PeakDayFormValues = z.infer<typeof peakDaySchema>;

interface PeakDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: PeakDayConfigEntity | null;
}

export function PeakDayModal({ open, onOpenChange, initialData }: PeakDayModalProps) {
  const createMutation = useCreatePeakDay();
  const updateMutation = useUpdatePeakDay();

  const isEditing = !!initialData;

  const form = useForm<PeakDayFormValues>({
    resolver: zodResolver(peakDaySchema),
    defaultValues: {
      name: "",
      startAt: null,
      endAt: null,
      startTime: "",
      endTime: "",
      peakRate: 0.1,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name,
        startAt: initialData.startAt ? new Date(initialData.startAt) : null,
        endAt: initialData.endAt ? new Date(initialData.endAt) : null,
        startTime: initialData.startTime || "",
        endTime: initialData.endTime || "",
        peakRate: initialData.peakRate,
        isActive: initialData.isActive,
      });
    } else if (open && !initialData) {
      form.reset({
        name: "",
        startAt: null,
        endAt: null,
        startTime: "",
        endTime: "",
        peakRate: 0.2, // Default +20%
        isActive: true,
      });
    }
  }, [open, initialData, form]);

  const onSubmit = (values: PeakDayFormValues) => {
    const payload = {
      name: values.name,
      startAt: values.startAt ? values.startAt.toISOString() : undefined,
      endAt: values.endAt ? values.endAt.toISOString() : undefined,
      startTime: values.startTime || undefined,
      endTime: values.endTime || undefined,
      peakRate: values.peakRate,
      isActive: values.isActive,
    };

    if (isEditing && initialData) {
      updateMutation.mutate(
        { id: initialData.id, payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin sm:max-w-[600px] rounded-[2rem] bg-[var(--c-card)] text-[var(--c-ink)] border-[var(--c-line)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? "Cập nhật ngày cao điểm" : "Thêm mới ngày cao điểm"}
          </DialogTitle>
          <DialogDescription>
            Cấu hình thời gian và tỉ lệ phụ thu áp dụng cho Lễ, Tết hoặc giờ cao điểm.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Tên cấu hình <span className="text-[#E11D48]">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Tết Nguyên Đán 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-bold">Ngày bắt đầu</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <BaseButton
                            variant="outline"
                            className={cn(
                              "h-11 justify-start text-left font-normal",
                              !field.value && "text-[var(--c-muted)]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày...</span>}
                          </BaseButton>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="cz-admin w-auto p-0 bg-[var(--c-card)] text-[var(--c-ink)] border-[var(--c-line)]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
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
                name="endAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-bold">Ngày kết thúc</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <BaseButton
                            variant="outline"
                            className={cn(
                              "h-11 justify-start text-left font-normal",
                              !field.value && "text-[var(--c-muted)]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày...</span>}
                          </BaseButton>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="cz-admin w-auto p-0 bg-[var(--c-card)] text-[var(--c-ink)] border-[var(--c-line)]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Khung giờ bắt đầu</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Chỉ áp dụng trong giờ cụ thể (tuỳ chọn).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Khung giờ kết thúc</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="peakRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Tỉ lệ phụ thu <span className="text-[#E11D48]">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Ví dụ: 0.2 nghĩa là phụ thu thêm 20%.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-[var(--c-line)] p-3 shadow-sm bg-[var(--c-card-2)]">
                    <div className="space-y-0.5">
                      <FormLabel className="font-bold">Hoạt động</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--c-line)]">
              <BaseButton type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</BaseButton>
              <BaseButton type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Lưu cấu hình
              </BaseButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
