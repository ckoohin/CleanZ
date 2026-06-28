"use client";

import React from "react";
import {
  BadgeCheck,
  FileText,
  Loader2,
  Save,
  Shield,
  Type,
  User,
  Users,
} from "lucide-react";
import { Policy } from "../types/policy.type";

export type PolicyFormValues = {
  title: string;
  slug: string;
  content: string;
  role: "CUSTOMER" | "TASKER" | "ALL";
  isActive: boolean;
};

type Props = {
  mode: "create" | "edit";
  values: PolicyFormValues;
  onChange: <K extends keyof PolicyFormValues>(
    key: K,
    value: PolicyFormValues[K]
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting?: boolean;
  submitText?: string;
  policy?: Policy | null;
};

const roleOptions: {
  value: PolicyFormValues["role"];
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "CUSTOMER",
    label: "Customer",
    description: "Chính sách áp dụng cho khách hàng",
    icon: <User className="w-4 h-4" />,
  },
  {
    value: "TASKER",
    label: "Tasker",
    description: "Chính sách áp dụng cho nhân viên / tasker",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    value: "ALL",
    label: "Tất cả",
    description: "Hiển thị cho toàn bộ người dùng hệ thống",
    icon: <Users className="w-4 h-4" />,
  },
];

function FieldLabel({
  title,
  required,
  description,
}: {
  title: string;
  required?: boolean;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
        {title}
        {required && <span className="text-red-500">*</span>}
      </label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function PolicyForm({
  mode,
  values,
  onChange,
  onSubmit,
  isSubmitting = false,
  submitText,
  policy,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* block 1 */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Type className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Thông tin cơ bản</h3>
            <p className="text-sm text-muted-foreground">
              Nhập tiêu đề, slug và đối tượng áp dụng cho chính sách.
            </p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* title */}
          <div className="space-y-2 xl:col-span-2">
            <FieldLabel
              title="Tiêu đề chính sách"
              required
              description="Tên hiển thị của chính sách trong hệ thống quản trị."
            />
            <input
              type="text"
              value={values.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="Ví dụ: Chính sách hoàn tiền"
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* slug */}
          <div className="space-y-2">
            <FieldLabel
              title="Slug"
              required
              description="Slug dùng để định danh chính sách trên hệ thống."
            />
            <input
              type="text"
              value={values.slug}
              onChange={(e) => onChange("slug", e.target.value)}
              placeholder="chinh-sach-hoan-tien"
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* status */}
          <div className="space-y-2">
            <FieldLabel
              title="Trạng thái"
              description="Bật/tắt khả năng hiển thị policy trên hệ thống."
            />
            <label className="flex items-center justify-between gap-4 rounded-2xl border bg-background px-4 py-3 cursor-pointer">
              <div>
                <p className="text-sm font-semibold">
                  {values.isActive ? "Đang hoạt động" : "Tạm ẩn"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {values.isActive
                    ? "Policy đang được phép hiển thị"
                    : "Policy đang bị ẩn khỏi hệ thống"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onChange("isActive", !values.isActive)}
                className={`relative h-7 w-12 rounded-full transition ${
                  values.isActive ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    values.isActive ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </label>
          </div>

          {/* role */}
          <div className="space-y-3 xl:col-span-2">
            <FieldLabel
              title="Đối tượng áp dụng"
              required
              description="Chọn nhóm người dùng sẽ nhìn thấy / áp dụng chính sách này."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {roleOptions.map((option) => {
                const active = values.role === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange("role", option.value)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                        : "bg-background hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {option.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{option.label}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-5">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* block 2 */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Nội dung chính sách</h3>
            <p className="text-sm text-muted-foreground">
              Nhập nội dung chi tiết hiển thị cho người dùng trong hệ thống.
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-2">
            <FieldLabel
              title="Nội dung"
              required
              description="Hỗ trợ xuống dòng. Nội dung này sẽ được hiển thị ở trang policy/detail cho người dùng."
            />
            <textarea
              value={values.content}
              onChange={(e) => onChange("content", e.target.value)}
              placeholder="Nhập nội dung chính sách..."
              rows={14}
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition resize-y focus:ring-2 focus:ring-primary/20 leading-7"
            />
          </div>
        </div>
      </div>

      {/* block 3 */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-bold">
              {mode === "edit" ? "Xác nhận cập nhật policy" : "Xác nhận tạo policy"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {mode === "edit"
                ? "Kiểm tra lại toàn bộ thông tin trước khi lưu thay đổi. Sau khi cập nhật, dữ liệu policy sẽ được áp dụng ngay trong hệ thống."
                : "Sau khi tạo mới, policy sẽ xuất hiện trong danh sách quản trị và có thể hiển thị cho người dùng tùy theo trạng thái."}
            </p>

            {policy?.updatedAt && mode === "edit" && (
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                Cập nhật gần nhất:{" "}
                <span className="font-semibold text-foreground">
                  {new Date(policy.updatedAt).toLocaleString("vi-VN")}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {submitText || (mode === "edit" ? "Lưu thay đổi" : "Tạo chính sách")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}