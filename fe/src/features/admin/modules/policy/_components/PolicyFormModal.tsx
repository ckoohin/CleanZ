'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { BaseButton } from '@/components/ui/base/base_button';
import { Separator } from '@/components/ui/separator';
import {
  Policy,
  PolicyCategory,
  PolicyRole,
  POLICY_CATEGORY_META,
} from '../types/policy.type';
import { useCreatePolicy } from '../hooks/useCreatePolicy';
import { useUpdatePolicy } from '../hooks/useUpdatePolicy';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  category: PolicyCategory;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_FORM: FormState = {
  title: '',
  slug: '',
  content: '',
  role: 'ALL',
  category: 'GENERAL',
  sortOrder: 0,
  isDefault: false,
  isActive: true,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PolicyFormModal({ open, onClose, policy }: PolicyFormModalProps) {
  const isEdit = Boolean(policy);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Populate form when dialog opens
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (policy) {
      setForm({
        title:     policy.title ?? '',
        slug:      policy.slug ?? '',
        content:   policy.content ?? '',
        role:      policy.role ?? 'ALL',
        category:  policy.category ?? 'GENERAL',
        sortOrder: policy.sortOrder ?? 0,
        isDefault: policy.isDefault ?? false,
        isActive:  policy.isActive ?? true,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [open, policy]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: isEdit ? prev.slug : slugify(value),
    }));
    setErrors((prev) => ({ ...prev, title: '', slug: '' }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.title.trim()) next.title = 'Vui lòng nhập tiêu đề';
    if (!form.slug.trim())  next.slug  = 'Vui lòng nhập slug';
    if (!form.content.trim()) next.content = 'Vui lòng nhập nội dung';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = {
      title:     form.title.trim(),
      slug:      form.slug.trim(),
      content:   form.content.trim(),
      role:      form.role,
      category:  form.category,
      sortOrder: form.sortOrder,
      isDefault: form.isDefault,
      isActive:  form.isActive,
    };
    try {
      if (isEdit && policy) {
        await updateMutation.mutateAsync({ id: policy.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch {
      // errors handled via toast in mutation
    }
  };

  const CategoryIcon = POLICY_CATEGORY_META[form.category]?.icon;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {CategoryIcon && (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${POLICY_CATEGORY_META[form.category].bgColor}`}>
                <CategoryIcon className="w-5 h-5" />
              </div>
            )}
            <div>
              <DialogTitle className="text-lg font-bold">
                {isEdit ? 'Cập nhật chính sách' : 'Tạo chính sách mới'}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {isEdit
                  ? `Chỉnh sửa "${policy?.title}"`
                  : 'Thêm chính sách vào thư viện hệ thống CleanZ'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Title */}
          <FormField label="Tiêu đề" required error={errors.title}>
            <Input
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="VD: Chính sách bảo mật thông tin"
              className={errors.title ? 'border-destructive' : ''}
            />
          </FormField>

          {/* Slug */}
          <FormField
            label="Slug (URL)"
            required
            error={errors.slug}
            hint="Dùng cho đường dẫn, ví dụ: privacy-policy"
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                /policies/
              </span>
              <Input
                value={form.slug}
                onChange={(e) => set('slug', slugify(e.target.value))}
                placeholder="privacy-policy"
                className={`pl-[72px] font-mono text-sm ${errors.slug ? 'border-destructive' : ''}`}
              />
            </div>
          </FormField>

          <Separator />

          {/* Category + Role (2 col) */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Loại chính sách" required>
              <Select value={form.category} onValueChange={(v) => set('category', v as PolicyCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).map((key) => {
                    const meta = POLICY_CATEGORY_META[key];
                    const Icon = meta.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Đối tượng áp dụng">
              <Select value={form.role} onValueChange={(v) => set('role', v as PolicyRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="TASKER">Tasker</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* sortOrder + isDefault + isActive (3 col) */}
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Thứ tự hiển thị" hint="Số nhỏ hơn hiển thị trước">
              <Input
                type="number"
                min={0}
                max={99}
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', Number(e.target.value))}
                className="text-center"
              />
            </FormField>

            <FormField label="Mặc định" hint="Tự động gán vào gói mới">
              <div className="flex items-center gap-3 h-9 px-3 rounded-md border border-input bg-background">
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(v) => set('isDefault', v)}
                />
                <span className="text-sm text-muted-foreground">
                  {form.isDefault ? 'Có' : 'Không'}
                </span>
              </div>
            </FormField>

            <FormField label="Trạng thái">
              <div className="flex items-center gap-3 h-9 px-3 rounded-md border border-input bg-background">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => set('isActive', v)}
                />
                <Badge variant={form.isActive ? 'default' : 'secondary'} className="text-xs">
                  {form.isActive ? 'Hoạt động' : 'Ẩn'}
                </Badge>
              </div>
            </FormField>
          </div>

          <Separator />

          {/* Content */}
          <FormField
            label="Nội dung (Markdown)"
            required
            error={errors.content}
            hint="Hỗ trợ Markdown: **đậm**, ## tiêu đề, - danh sách, | bảng"
          >
            <Textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              rows={12}
              placeholder="## Giới thiệu&#10;&#10;Nhập nội dung chính sách tại đây..."
              className={`resize-none font-mono text-sm leading-relaxed ${errors.content ? 'border-destructive' : ''}`}
            />
          </FormField>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t">
          <BaseButton variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </BaseButton>
          <BaseButton
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {!isSubmitting && (isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
            {isEdit ? 'Cập nhật' : 'Tạo chính sách'}
          </BaseButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}