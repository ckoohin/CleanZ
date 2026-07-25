"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { PolicyForm, PolicyFormValues } from "./PolicyForm";
import { useAdminPolicyDetail } from "@/features/admin/modules/policy/hooks/useAdminPolicyDetail";
import { useCreatePolicy } from "@/features/admin/modules/policy/hooks/useCreatePolicy";
import { useUpdatePolicy } from "@/features/admin/modules/policy/hooks/useUpdatePolicy";

type Props = {
  mode: "create" | "edit";
  id?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const DEFAULT_VALUES: PolicyFormValues = {
  title: "",
  slug: "",
  content: "",
  role: "ALL",
  isActive: true,
};

export function PolicyEditView({ mode, id }: Props) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const detailQuery = useAdminPolicyDetail(isEdit && id ? id : "");
  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();

  const [values, setValues] = useState<PolicyFormValues>(DEFAULT_VALUES);
  const [isSlugTouched, setIsSlugTouched] = useState(false);

  const policy = detailQuery.data;

  useEffect(() => {
    if (!isEdit || !policy) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state sau mount / khi mở form; giữ nguyên hành vi hiện tại
    setValues({
      title: policy.title ?? "",
      slug: policy.slug ?? "",
      content: policy.content ?? "",
      role: (policy.role as PolicyFormValues["role"]) ?? "ALL",
      isActive: typeof policy.isActive === "boolean" ? policy.isActive : true,
    });

    setIsSlugTouched(true);
  }, [isEdit, policy]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleChange = <K extends keyof PolicyFormValues>(
    key: K,
    value: PolicyFormValues[K]
  ) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "title" && !isSlugTouched) {
        next.slug = slugify(String(value));
      }

      return next;
    });

    if (key === "slug") {
      setIsSlugTouched(true);
    }
  };

  const validate = () => {
    if (!values.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề chính sách");
      return false;
    }

    if (!values.slug.trim()) {
      toast.error("Vui lòng nhập slug");
      return false;
    }

    if (!values.content.trim()) {
      toast.error("Vui lòng nhập nội dung chính sách");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = {
      title: values.title.trim(),
      slug: values.slug.trim(),
      content: values.content.trim(),
      role: values.role,
      isActive: values.isActive,
    };

    try {
      if (isEdit) {
        if (!id) {
          toast.error("Không tìm thấy ID chính sách để cập nhật");
          return;
        }

        await updateMutation.mutateAsync({
          id,
          payload,
        });

        toast.success("Cập nhật chính sách thành công");
        router.push(`/admin/policies/${id}`);
        return;
      }

      const created = await createMutation.mutateAsync(payload);
      toast.success("Tạo chính sách thành công");

      if (created?.id) {
        router.push(`/admin/policies/${created.id}`);
      } else {
        router.push("/admin/policies");
      }
    } catch (error) {
      console.error("Save policy error:", error);
      toast.error("Có lỗi khi lưu chính sách");
    }
  };

  if (isEdit && !id) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600">
        Không tìm thấy ID chính sách trên URL.
      </div>
    );
  }

  if (isEdit && detailQuery.isLoading) {
    return (
      <div className="rounded-3xl border bg-card px-5 py-16 flex items-center justify-center text-muted-foreground shadow-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải dữ liệu chính sách...
      </div>
    );
  }

  if (isEdit && (detailQuery.isError || !policy)) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600 space-y-2">
        <p className="font-semibold">
          Không thể tải dữ liệu chính sách để chỉnh sửa.
        </p>
        <p>Vui lòng thử lại hoặc quay về danh sách policy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                {isEdit ? "Chỉnh sửa chính sách" : "Tạo chính sách mới"}
              </div>

              <div>
                <h2 className="text-2xl font-black leading-tight">
                  {isEdit ? values.title || "Chỉnh sửa policy" : "Tạo policy mới"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isEdit
                    ? "Cập nhật thông tin và nội dung hiển thị của chính sách."
                    : "Tạo mới một policy để hiển thị trong hệ thống CleanZ."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={isEdit && id ? `/admin/policies/${id}` : "/admin/policies"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold hover:bg-muted transition"
            >
              <ArrowLeft className="w-4 h-4" />
              {isEdit ? "Quay lại chi tiết" : "Quay lại danh sách"}
            </Link>

            {isEdit && id && (
              <Link
                href={`/admin/policies/${id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                <Pencil className="w-4 h-4" />
                Xem chi tiết
              </Link>
            )}

            {!isEdit && (
              <Link
                href="/admin/policies"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="w-4 h-4" />
                Danh sách policy
              </Link>
            )}
          </div>
        </div>
      </div>

      <PolicyForm
        mode={mode}
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitText={isEdit ? "Lưu thay đổi" : "Tạo chính sách"}
        policy={policy ?? null}
      />
    </div>
  );
}