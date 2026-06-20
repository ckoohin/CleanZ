'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, X } from 'lucide-react';
import { Policy, PolicyRole } from '../types/policy.type';
import { useCreatePolicy } from '../hooks/useCreatePolicy';
import { useUpdatePolicy } from '../hooks/useUpdatePolicy';

type PolicyFormModalProps = {
  open: boolean;
  onClose: () => void;
  policy?: Policy | null;
};

type FormState = {
  title: string;
  slug: string;
  content: string;
  role: PolicyRole;
  isActive: boolean;
};

const defaultForm: FormState = {
  title: '',
  slug: '',
  content: '',
  role: 'ALL',
  isActive: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function PolicyFormModal({
  open,
  onClose,
  policy,
}: PolicyFormModalProps) {
  const isEdit = Boolean(policy);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const modalTitle = useMemo(
    () => (isEdit ? 'Cập nhật chính sách' : 'Thêm chính sách'),
    [isEdit],
  );

  useEffect(() => {
    if (!open) return;

    if (policy) {
      setForm({
        title: policy.title ?? '',
        slug: policy.slug ?? '',
        content: policy.content ?? '',
        role: policy.role ?? 'ALL',
        isActive: policy.isActive ?? true,
      });
    } else {
      setForm(defaultForm);
    }

    setErrors({});
  }, [open, policy]);

  if (!open) return null;

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: !isEdit ? slugify(value) : prev.slug,
    }));
    setErrors((prev) => ({ ...prev, title: '', slug: '' }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Vui lòng nhập tiêu đề chính sách';
    }

    if (!form.slug.trim()) {
      nextErrors.slug = 'Vui lòng nhập slug';
    }

    if (!form.content.trim()) {
      nextErrors.content = 'Vui lòng nhập nội dung chính sách';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      content: form.content.trim(),
      role: form.role,
      isActive: form.isActive,
    };

    try {
      if (isEdit && policy) {
        await updateMutation.mutateAsync({
          id: policy.id,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onClose();
    } catch {
      // đã xử lý bằng toast
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-border/60 bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-xl font-black tracking-tight">{modalTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit
                ? 'Chỉnh sửa thông tin chính sách đang có trong hệ thống.'
                : 'Tạo mới một chính sách để hiển thị cho customer, tasker hoặc toàn hệ thống.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Tiêu đề chính sách</label>
            <input
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ví dụ: Chính sách bảo mật"
              className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary"
            />
            {errors.title ? (
              <p className="text-xs text-red-500">{errors.title}</p>
            ) : null}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => handleChange('slug', slugify(e.target.value))}
              placeholder="vi-du-chinh-sach-bao-mat"
              className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Slug dùng cho URL, ví dụ: <span className="font-medium">privacy-policy</span>
            </p>
            {errors.slug ? (
              <p className="text-xs text-red-500">{errors.slug}</p>
            ) : null}
          </div>

          {/* Role + Status */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Đối tượng áp dụng</label>
              <select
                value={form.role}
                onChange={(e) =>
                  handleChange('role', e.target.value as PolicyRole)
                }
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary"
              >
                <option value="ALL">Tất cả</option>
                <option value="CUSTOMER">Customer</option>
                <option value="TASKER">Tasker</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Trạng thái</label>
              <div className="flex h-12 items-center gap-6 rounded-2xl border border-input px-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.isActive === true}
                    onChange={() => handleChange('isActive', true)}
                  />
                  Đang hoạt động
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.isActive === false}
                    onChange={() => handleChange('isActive', false)}
                  />
                  Tạm ẩn
                </label>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nội dung chính sách</label>
            <textarea
              value={form.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Nhập nội dung chi tiết của chính sách..."
              rows={10}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
            {errors.content ? (
              <p className="text-xs text-red-500">{errors.content}</p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-2xl border px-5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : isEdit ? (
              <>
                <Save className="h-4 w-4" />
                Cập nhật chính sách
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Tạo chính sách
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}