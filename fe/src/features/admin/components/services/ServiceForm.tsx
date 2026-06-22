"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ImageIcon, ListChecks, FileText, CheckCircle2, XCircle } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BaseButton } from "@/components/ui/base/base_button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminServiceEntity, CreateAdminServiceDto } from "../../services/admin-services.service";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import { DynamicListInput } from "@/components/ui/dynamic-list-input";

const serviceSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên dịch vụ").max(255, "Tên quá dài"),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  galleryUrls: z.array(z.string()).optional(),
  includedTasks: z.array(z.string()).optional(),
  excludedTasks: z.array(z.string()).optional(),
  baseDurationHours: z.string().optional(),
  coverageArea: z.string().optional(),
  isActive: z.boolean(),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  initialValues?: Partial<AdminServiceEntity>;
  onSubmit: (values: CreateAdminServiceDto) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  categories?: { id: string; name: string }[];
}

export function ServiceForm({ initialValues, onSubmit, isSubmitting, isEditMode, categories = [] }: ServiceFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: initialValues?.name || "",
      shortDescription: initialValues?.shortDescription || "",
      description: initialValues?.description || "",
      thumbnailUrl: initialValues?.thumbnailUrl || "",
      galleryUrls: initialValues?.galleryUrls || [],
      includedTasks: initialValues?.includedTasks || [],
      excludedTasks: initialValues?.excludedTasks || [],
      baseDurationHours: initialValues?.baseDurationHours ? String(initialValues.baseDurationHours) : "",
      coverageArea: initialValues?.coverageArea || "",
      isActive: initialValues?.isActive ?? true,
      categoryId: initialValues?.categoryId || "",
    },
  });

  const handleSubmit = (values: ServiceFormValues) => {
    // Validate number on submit manually
    let parsedDuration: number | undefined = undefined;
    if (values.baseDurationHours && values.baseDurationHours.trim() !== "") {
      const num = Number(values.baseDurationHours);
      if (isNaN(num) || num < 0.5) {
        form.setError("baseDurationHours", { type: "manual", message: "Thời lượng tối thiểu 0.5 giờ" });
        return;
      }
      parsedDuration = num;
    }

    const payload: CreateAdminServiceDto = {
      name: values.name,
      shortDescription: values.shortDescription || undefined,
      description: values.description || undefined,
      thumbnailUrl: values.thumbnailUrl || undefined,
      galleryUrls: values.galleryUrls?.length ? values.galleryUrls : undefined,
      includedTasks: values.includedTasks?.length ? values.includedTasks : undefined,
      excludedTasks: values.excludedTasks?.length ? values.excludedTasks : undefined,
      baseDurationHours: parsedDuration,
      coverageArea: values.coverageArea || undefined,
      isActive: values.isActive,
      categoryId: values.categoryId,
    };
    onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl h-auto">
            <TabsTrigger value="basic" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="w-4 h-4 mr-2" />
              Thông tin chung
            </TabsTrigger>
            <TabsTrigger value="media" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ImageIcon className="w-4 h-4 mr-2" />
              Hình ảnh
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ListChecks className="w-4 h-4 mr-2" />
              Chi tiết công việc
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 animate-in fade-in-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel className="font-bold">Tên dịch vụ <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên dịch vụ (VD: Dọn dẹp nhà cơ bản)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel className="font-bold">Danh mục <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn danh mục cho dịch vụ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel className="font-bold">Mô tả ngắn gọn</FormLabel>
                    <FormControl>
                      <Input placeholder="Một câu giới thiệu ngắn gọn gọn hiển thị ở danh sách" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel className="font-bold">Mô tả chi tiết</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả đầy đủ công việc của dịch vụ này..."
                        className="min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseDurationHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Thời lượng cơ bản</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn thời lượng..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0.5">0.5 giờ (30 phút)</SelectItem>
                        <SelectItem value="1">1.0 giờ</SelectItem>
                        <SelectItem value="1.5">1.5 giờ (1h 30m)</SelectItem>
                        <SelectItem value="2">2.0 giờ</SelectItem>
                        <SelectItem value="2.5">2.5 giờ (2h 30m)</SelectItem>
                        <SelectItem value="3">3.0 giờ</SelectItem>
                        <SelectItem value="4">4.0 giờ</SelectItem>
                        <SelectItem value="8">8.0 giờ (Cả ngày)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Ước tính thời gian tối thiểu để hoàn thành.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverageArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Khu vực phục vụ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn khu vực hoạt động..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Toàn quốc">Toàn quốc (Tất cả)</SelectItem>
                        <SelectItem value="Hà Nội">Hà Nội</SelectItem>
                        <SelectItem value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</SelectItem>
                        <SelectItem value="Đà Nẵng">Đà Nẵng</SelectItem>
                        <SelectItem value="Hải Phòng">Hải Phòng</SelectItem>
                        <SelectItem value="Cần Thơ">Cần Thơ</SelectItem>
                        <SelectItem value="Bình Dương">Bình Dương</SelectItem>
                        <SelectItem value="Đồng Nai">Đồng Nai</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Khu vực địa lý mà dịch vụ này hỗ trợ.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2 flex flex-row items-center justify-between rounded-xl border border-border p-4 shadow-sm bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-bold text-foreground">
                        Trạng thái hoạt động
                      </FormLabel>
                      <FormDescription>
                        Khách hàng chỉ thấy các dịch vụ đang được kích hoạt.
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
          </TabsContent>

          <TabsContent value="media" className="space-y-8 animate-in fade-in-50">
            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-lg">Ảnh đại diện chính</FormLabel>
                  <FormDescription className="mb-4">
                    Ảnh thu nhỏ hiển thị ngoài danh sách dịch vụ.
                  </FormDescription>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      onRemove={() => field.onChange("")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="h-px bg-border w-full my-6"></div>

            <FormField
              control={form.control}
              name="galleryUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-lg">Thư viện ảnh phụ</FormLabel>
                  <FormDescription className="mb-4">
                    Tải lên nhiều ảnh để khách hàng xem chi tiết dịch vụ.
                  </FormDescription>
                  <FormControl>
                    <MultipleImageUpload
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-8 animate-in fade-in-50">
            <FormField
              control={form.control}
              name="includedTasks"
              render={({ field }) => (
                <FormItem className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
                  <div className="mb-6 flex flex-col gap-1.5">
                    <FormLabel className="font-bold text-xl flex items-center gap-2 text-primary">
                      <CheckCircle2 className="w-6 h-6" />
                      Danh sách công việc BAO GỒM
                    </FormLabel>
                    <FormDescription className="text-primary/70 text-base">
                      Các hạng mục công việc mà Tasker bắt buộc phải thực hiện trong gói dịch vụ này.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <DynamicListInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="VD: Quét nhà, lau sàn, đổ rác..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="excludedTasks"
              render={({ field }) => (
                <FormItem className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
                  <div className="mb-6 flex flex-col gap-1.5">
                    <FormLabel className="font-bold text-xl flex items-center gap-2 text-destructive">
                      <XCircle className="w-6 h-6" />
                      Danh sách công việc KHÔNG BAO GỒM
                    </FormLabel>
                    <FormDescription className="text-destructive/70 text-base">
                      Các yêu cầu ngoài phạm vi dịch vụ, Tasker có quyền từ chối thực hiện.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <DynamicListInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="VD: Không giặt thảm, không dọn dẹp ngoài trời..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 pt-6 border-t border-border mt-8">
          <BaseButton
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full md:w-auto h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditMode ? "Lưu thay đổi" : "Tạo dịch vụ mới"}
          </BaseButton>
        </div>
      </form>
    </Form>
  );
}
