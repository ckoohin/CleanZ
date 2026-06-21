import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, DollarSign, Save } from "lucide-react";
import { BaseButton } from "@/components/ui/base/base_button";
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
import { AdminServiceEntity } from "@/features/admin/services/admin-services.service";
import {
  usePricingConfigs,
  useCreatePricingConfig,
  useUpdatePricingConfig,
} from "@/features/admin/hooks/useAdminPricing";
import BaseEmptyState from "@/components/ui/base/base_empty_state";

interface ServicePricingTabProps {
  service: AdminServiceEntity;
}

const pricingSchema = z.object({
  basePrice: z.number().min(1000, "Giá cơ bản phải lớn hơn 1000 VNĐ"),
  peakPrice: z.number().nullable().optional(),
  petFee: z.number().min(0, "Không được nhỏ hơn 0"),
  waitingFee: z.number().min(0, "Không được nhỏ hơn 0"),
  platformCommissionRate: z.number().min(0).max(100, "Không được vượt quá 100%"),
  isActive: z.boolean(),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

export function ServicePricingTab({ service }: ServicePricingTabProps) {
  const { data: response, isLoading: isLoadingConfig } = usePricingConfigs({ serviceId: service.id });
  const config = response?.items?.[0];

  const createMutation = useCreatePricingConfig();
  const updateMutation = useUpdatePricingConfig();

  const [showForm, setShowForm] = useState(false);
  const isEditing = !!config;

  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      basePrice: 0,
      peakPrice: null,
      petFee: 0,
      waitingFee: 0,
      platformCommissionRate: 20,
      isActive: true,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        basePrice: config.basePrice || 0,
        peakPrice: config.peakPrice ?? null,
        petFee: config.petFee || 0,
        waitingFee: config.waitingFee || 0,
        platformCommissionRate: config.platformCommissionRate || 20,
        isActive: config.isActive ?? true,
      });
    } else {
      form.reset({
        basePrice: 0,
        peakPrice: null,
        petFee: 0,
        waitingFee: 0,
        platformCommissionRate: 20,
        isActive: true,
      });
    }
  }, [config, form]);

  const onSubmit = (values: PricingFormValues) => {
    if (isEditing && config) {
      updateMutation.mutate({
        id: config.id,
        payload: {
          basePrice: values.basePrice,
          peakPrice: values.peakPrice ?? null,
          petFee: values.petFee,
          waitingFee: values.waitingFee,
          platformCommissionRate: values.platformCommissionRate,
          isActive: values.isActive,
        },
      });
    } else {
      createMutation.mutate({
        serviceId: service.id,
        ...values,
        peakPrice: values.peakPrice ?? null,
      });
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!config && !showForm && !createMutation.isPending) {
    return (
      <div className="py-12 border border-dashed border-border rounded-2xl bg-muted/10">
        <BaseEmptyState
          title="Chưa có bảng giá"
          description="Dịch vụ này chưa được thiết lập bảng giá. Bạn cần khởi tạo bảng giá để khách hàng có thể đặt lịch."
          icon={DollarSign}
        />
        <div className="flex justify-center mt-6">
          <BaseButton onClick={() => setShowForm(true)}>Khởi tạo bảng giá</BaseButton>
        </div>
      </div>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8 animate-in fade-in-50">
      <div>
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" />
          {isEditing ? "Cập nhật bảng giá" : "Khởi tạo bảng giá mới"}
        </h3>
        <p className="text-muted-foreground mt-1">Thiết lập mức phí và hoa hồng áp dụng cho dịch vụ này.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Giá cơ bản (VNĐ) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="VD: 150000" 
                      {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Mức giá gốc áp dụng tính theo mỗi khoảng thời lượng cơ bản.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="peakPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Giá cao điểm (VNĐ)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="VD: 180000" 
                      {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Mức giá áp dụng trong giờ cao điểm (nếu có thiết lập).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="petFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Phụ phí thú cưng (VNĐ)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="VD: 50000" 
                      {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Phí cộng thêm nếu khách hàng có nuôi chó mèo.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="waitingFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Phí chờ (VNĐ)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="VD: 30000" 
                      {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Phụ phí chờ đợi mỗi 30 phút (nếu có).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platformCommissionRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Tỉ lệ hoa hồng hệ thống (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder="VD: 20" 
                      {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Phần trăm hệ thống thu từ Tasker (VD: 20%).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-4 shadow-sm bg-muted/20 md:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-bold text-foreground">
                      Kích hoạt bảng giá
                    </FormLabel>
                    <FormDescription>
                      Cho phép tính phí bằng bảng giá này.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-border mt-8">
            <BaseButton
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isEditing ? "Lưu thay đổi" : "Lưu bảng giá"}
            </BaseButton>
          </div>
        </form>
      </Form>
    </div>
  );
}
