"use client";

import React, { useState } from "react";
import { 
  Briefcase, FileText,
  Trash2, Play, RefreshCw, Layers, ShieldAlert, Sparkles,
  CheckCircle, Ban, Copy
} from "lucide-react";
import { BaseButton } from "@/components/ui/base/base_button";
import { BaseImageUpload } from "@/components/ui/base/base_image_upload";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { BaseTableList, type Column, type RowAction, type BulkAction } from "@/components/ui/base/base_table_list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Container from "@/components/Container";
import { toast } from "@/lib/toast";

// Mock Data for Table
interface MockTasker {
  id: string;
  fullName: string;
  phone: string;
  experience: string;
  skills: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
}

const MOCK_TASKERS: MockTasker[] = [
  { id: "1", fullName: "Nguyễn Văn A", phone: "0987654321", experience: "3 năm", skills: "Dọn dẹp nhà, Giặt là", status: "APPROVED" },
  { id: "2", fullName: "Trần Thị B", phone: "0912345678", experience: "5 năm", skills: "Trông trẻ, Nấu ăn", status: "APPROVED" },
  { id: "3", fullName: "Lê Văn C", phone: "0909998887", experience: "1 năm", skills: "Vệ sinh máy lạnh", status: "PENDING" },
  { id: "4", fullName: "Phạm Minh D", phone: "0933445566", experience: "2 năm", skills: "Sửa điện nước, Lắp đặt", status: "APPROVED" },
  { id: "5", fullName: "Hoàng Thị E", phone: "0944556677", experience: "4 năm", skills: "Chăm sóc người già", status: "REJECTED" },
  { id: "6", fullName: "Đặng Văn F", phone: "0955667788", experience: "6 năm", skills: "Tổng vệ sinh văn phòng", status: "APPROVED" },
  { id: "7", fullName: "Ngô Thị G", phone: "0966778899", experience: "2 năm", skills: "Dọn dẹp nhà theo giờ", status: "PENDING" },
  { id: "8", fullName: "Bùi Văn H", phone: "0977889900", experience: "8 năm", skills: "Phun thuốc khử trùng", status: "APPROVED" },
  { id: "9", fullName: "Vũ Thị I", phone: "0988990011", experience: "3 năm", skills: "Giặt sấy rèm cửa", status: "APPROVED" },
  { id: "10", fullName: "Đỗ Văn J", phone: "0999001122", experience: "1 năm", skills: "Dọn dẹp sân vườn", status: "PENDING" },
];

export default function TestPage() {
  // ─── Button States ───
  const [btnLoading, setBtnLoading] = useState(false);

  const triggerBtnLoading = () => {
    setBtnLoading(true);
    setTimeout(() => setBtnLoading(false), 2000);
  };

  // ─── Image Upload States ───
  const [avatar, setAvatar] = useState<string | string[]>("");
  const [citizenCards, setCitizenCards] = useState<string | string[]>([]);

  const mockUploadApi = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(URL.createObjectURL(file));
      }, 1500);
    });
  };

  // ─── Table List States ───
  const [tableLoading, setTableLoading] = useState(false);
  const [tableEmpty, setTableEmpty] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTaskers, setSelectedTaskers] = useState<MockTasker[]>([]);

  const triggerTableLoading = () => {
    setTableLoading(true);
    setTimeout(() => setTableLoading(false), 1500);
  };

  // Lọc và phân trang dữ liệu client-side để Test
  const filteredData = tableEmpty
    ? []
    : MOCK_TASKERS.filter((item) => {
        const matchKeyword =
          item.fullName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          item.phone.includes(searchKeyword);
        const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
        return matchKeyword && matchStatus;
      });

  const paginatedData = filteredData.slice((page - 1) * limit, page * limit);

  // Table Columns Definition
  const columns: Column<MockTasker>[] = [
    {
      key: "fullName",
      title: "Họ và Tên",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {row.fullName[0]}
          </div>
          <div>
            <p className="font-semibold text-sm">{row.fullName}</p>
            <p className="text-xs text-muted-foreground">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "skills",
      title: "Dịch vụ đăng ký",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-muted-foreground">{row.skills}</span>
      ),
    },
    {
      key: "experience",
      title: "Kinh nghiệm",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-bold text-foreground/80">{row.experience}</span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => {
        const styleMap = {
          APPROVED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
          PENDING: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
          REJECTED: "bg-red-500/10 text-red-700 border-red-500/20",
        };
        const labelMap = {
          APPROVED: "✓ Đã duyệt",
          PENDING: "⏳ Chờ duyệt",
          REJECTED: "✗ Từ chối",
        };
        return (
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${styleMap[row.status]}`}
          >
            {labelMap[row.status]}
          </span>
        );
      },
    },
  ];

  // Row Actions
  const rowActions: RowAction<MockTasker>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      onClick: (row) => toast.info(`Xem: ${row.fullName}`),
    },
    {
      type: "edit",
      label: "Chỉnh sửa",
      onClick: (row) => toast.success(`Sửa: ${row.fullName}`),
    },
    {
      type: "approve",
      label: "Duyệt hồ sơ",
      icon: CheckCircle,
      onClick: (row) => toast.success(`Đã duyệt: ${row.fullName}`),
      hidden: (row) => row.status !== "PENDING",
    },
    {
      type: "ban",
      label: "Đình chỉ tài khoản",
      icon: Ban,
      onClick: (row) => toast.warning(`Đình chỉ: ${row.fullName}`),
      hidden: (row) => row.status === "REJECTED",
      variant: "destructive",
    },
    {
      label: "Sao chép ID",
      icon: Copy,
      onClick: (row) => {
        navigator.clipboard.writeText(row.id);
        toast.info(`Đã copy ID: ${row.id}`);
      },
    },
    {
      type: "delete",
      label: "Xóa tài khoản",
      onClick: (row) => toast.error(`Đã xóa: ${row.fullName}`),
      variant: "destructive",
    },
  ];

  // Bulk Actions
  const bulkActions: BulkAction<MockTasker>[] = [
    {
      label: "Duyệt tất cả",
      icon: CheckCircle,
      onClick: (rows) =>
        toast.success(`Đã duyệt ${rows.length} đối tác được chọn`),
      variant: "default",
    },
    {
      label: `Xóa đã chọn`,
      icon: Trash2,
      onClick: (rows) =>
        toast.error(`Đã xóa ${rows.length} bản ghi`),
      variant: "destructive",
    },
  ];

  return (
    <main className="min-h-screen bg-background py-12">
      <Container classNameContent="space-y-12">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles size={12} /> CleanZ Base Components
          </div>
          <h1 className="text-3xl font-black text-balance leading-tight tracking-tight">
            Trang Kiểm Thử Base Components Dùng Chung
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            Demo tương tác đầy đủ các cấu trúc component base trong{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs font-bold">
              components/ui/base/
            </code>
          </p>
        </div>

        {/* SECTION 1: BaseButton & BaseEmptyState */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Base Button Demo */}
          <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                <Layers className="text-primary w-5 h-5" /> 1. Base Button (Nút bấm Premium)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Hỗ trợ các trạng thái, variants cao cấp và loading spinner.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <BaseButton variant="primary">Primary Brand</BaseButton>
              <BaseButton variant="glass">Glassmorphism</BaseButton>
              <BaseButton variant="outline">Outline Button</BaseButton>
              <BaseButton variant="secondary">Secondary</BaseButton>
              <BaseButton variant="ghost">Ghost Style</BaseButton>
              <BaseButton variant="destructive">Destructive</BaseButton>
            </div>

            <div className="bg-muted/40 p-4 rounded-xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Test Trạng thái Loading:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <BaseButton
                  variant="primary"
                  isLoading={btnLoading}
                  onClick={triggerBtnLoading}
                  className="flex-1"
                >
                  {btnLoading ? "Đang xử lý..." : "Bấm để Loading 2s"}
                </BaseButton>
                <BaseButton variant="glass" disabled className="flex-1">
                  Nút bị Disabled
                </BaseButton>
              </div>
            </div>
          </div>

          {/* Base Empty State Demo */}
          <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                <ShieldAlert className="text-primary w-5 h-5" /> 2. Base Empty State
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Dùng hiển thị các màn hình trống, không tìm thấy kết quả.
              </p>
            </div>

            <BaseEmptyState
              title="Không tìm thấy lịch làm việc"
              description="Đối tác hiện tại chưa đăng ký lịch làm việc cho tuần này. Vui lòng thêm lịch để tiếp tục nhận đơn hàng."
              icon={Briefcase}
              action={
                <BaseButton variant="primary" size="sm">
                  Thêm lịch ngay
                </BaseButton>
              }
            />
          </div>
        </div>

        {/* SECTION 2: BaseImageUpload */}
        <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
              <FileText className="text-primary w-5 h-5" /> 3. Base Image Upload (Drag & Drop & Preview)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Giả lập quá trình tải ảnh lên API Cloudinary thật sự trong 1.5 giây.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-xl">
                <p className="text-xs font-bold text-foreground">
                  A. Upload ảnh đơn (Ví dụ: Ảnh đại diện)
                </p>
              </div>
              <BaseImageUpload
                value={avatar}
                onChange={setAvatar}
                onUpload={mockUploadApi}
                maxFiles={1}
                label="Ảnh chân dung đối tác"
                description="Hỗ trợ JPG, PNG. Ảnh rõ mặt, kích thước tối đa 5MB."
              />
            </div>

            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-xl">
                <p className="text-xs font-bold text-foreground">
                  B. Upload nhiều ảnh (Ví dụ: CCCD 2 mặt)
                </p>
              </div>
              <BaseImageUpload
                value={citizenCards}
                onChange={setCitizenCards}
                onUpload={mockUploadApi}
                maxFiles={2}
                label="Ảnh chụp Căn cước công dân (CCCD)"
                description="Vui lòng tải lên đầy đủ 2 mặt Mặt Trước & Mặt Sau của CCCD."
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: BaseTableList */}
        <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers className="text-primary w-5 h-5" /> 4. Base Table List — Full Featured
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Phân trang · Tìm kiếm · Lọc · Skeleton · Empty State ·{" "}
                <strong className="text-foreground">Multi-Select</strong> ·{" "}
                <strong className="text-foreground">Bulk Actions</strong> ·{" "}
                <strong className="text-foreground">Row CRUD Actions</strong>
              </p>
            </div>

            {/* Test controllers */}
            <div className="flex items-center gap-2 flex-wrap">
              <BaseButton
                variant="outline"
                size="sm"
                onClick={triggerTableLoading}
                className="h-8 text-xs"
              >
                <RefreshCw size={12} className={tableLoading ? "animate-spin" : ""} />
                Toggle Loading
              </BaseButton>
              <BaseButton
                variant={tableEmpty ? "primary" : "outline"}
                size="sm"
                onClick={() => setTableEmpty(!tableEmpty)}
                className="h-8 text-xs"
              >
                <Play size={12} />
                {tableEmpty ? "Hiện dữ liệu" : "Giả lập Rỗng"}
              </BaseButton>
            </div>
          </div>

          {/* Debug info */}
          {selectedTaskers.length > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 font-medium">
              🔍 Debug: Đang chọn{" "}
              <strong className="text-foreground">{selectedTaskers.length}</strong> bản ghi —{" "}
              <span className="text-primary font-semibold">
                {selectedTaskers.map((s) => s.fullName).join(", ")}
              </span>
            </div>
          )}

          <BaseTableList
            columns={columns}
            data={paginatedData}
            rowKey="id"
            totalItems={filteredData.length}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(lim) => {
              setLimit(lim);
              setPage(1);
            }}
            keyword={searchKeyword}
            onKeywordChange={(kw) => {
              setSearchKeyword(kw);
              setPage(1);
            }}
            placeholderSearch="Tìm theo tên hoặc số điện thoại..."
            isLoading={tableLoading}
            emptyTitle="Không có đối tác nào"
            emptyDescription="Danh sách đối tác trống hoặc bộ lọc không tìm thấy kết quả nào phù hợp."
            filters={
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11 min-w-[160px] rounded-xl border-border/60 bg-background text-sm font-medium focus:ring-primary/20">
                  <SelectValue placeholder="Lọc trạng thái" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="APPROVED">✓ Đã duyệt</SelectItem>
                  <SelectItem value="PENDING">⏳ Chờ duyệt</SelectItem>
                  <SelectItem value="REJECTED">✗ Từ chối</SelectItem>
                </SelectContent>
              </Select>
            }
            rowActions={rowActions}
            inlineActionCount={2}
            bulkActions={bulkActions}
            onSelectionChange={setSelectedTaskers}
          />
        </div>
      </Container>
    </main>
  );
}