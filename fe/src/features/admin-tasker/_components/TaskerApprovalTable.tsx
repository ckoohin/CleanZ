"use client";

import React, { useState } from "react";
import { BaseTableList, type Column, type RowAction, type BulkAction } from "@/components/ui/base/base_table_list";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  useAdminTasker, 
  useApproveTasker, 
  useRejectTasker,
  useRequestMoreInfoTasker
} from "../hooks/admin-tasker.hooks";
import { TaskerStatus, TaskerProfile } from "@/features/tasker/types/tasker.type";
import { AdminTaskerFilter } from "../services/admin-tasker.service";
import { TaskerDetailModal } from "./TaskerDetailModal";
import { AdminReviewModal } from "./AdminReviewModal";
import { Eye, CheckCircle, Info, XCircle, Trash2, Clock, ListFilter } from "lucide-react";
import { toast } from "sonner";

// ─── MOCK DATA FALLBACK ───
const MOCK_TASKER_DATA: TaskerProfile[] = Array.from({ length: 500 }).map((_, i) => ({
  id: `mock-${i + 1}`,
  userId: `u${i + 1}`,
  fullName: `Ứng viên mẫu ${i + 1}`,
  phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
  experience: `${Math.floor(Math.random() * 5) + 1} năm kinh nghiệm`,
  skills: ["Dọn dẹp", "Nấu ăn", "Giặt ủi", "Sửa chữa", "Vệ sinh máy lạnh"][i % 5],
  bio: "Chăm chỉ, thật thà",
  avatarUrl: null,
  approvalStatus: [TaskerStatus.PENDING, TaskerStatus.APPROVED, TaskerStatus.NEED_INFO, TaskerStatus.REJECTED][i % 4],
  totalJobs: Math.floor(Math.random() * 50),
  avgRating: Math.floor(Math.random() * 5),
  createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
}));

export const TaskerApprovalTable: React.FC = () => {
  const [filter, setFilter] = useState<{
    status: TaskerStatus | "ALL";
    keyword: string;
    page: number;
    limit: number;
  }>({
    status: "ALL",
    keyword: "",
    page: 1,
    limit: 5
  });

  const { data: response, isLoading } = useAdminTasker({
    ...filter,
    status: filter.status === "ALL" ? undefined : filter.status
  } as AdminTaskerFilter);

  const approveMutation = useApproveTasker();
  const rejectMutation = useRejectTasker();
  const requestInfoMutation = useRequestMoreInfoTasker();

  const [selectedTaskers, setSelectedTaskers] = useState<TaskerProfile[]>([]);
  const [selectedTaskerId, setSelectedTaskerId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    taskerId: string;
    type: "reject" | "request_info";
  }>({
    isOpen: false,
    taskerId: "",
    type: "reject"
  });

  // Logic xử lý mock nếu không có API
  const isUsingMock = !response?.data || response.data.length === 0;
  
  const filteredMockData = MOCK_TASKER_DATA.filter(tasker => {
    const matchStatus = filter.status === "ALL" || tasker.approvalStatus === filter.status;
    const matchKeyword = !filter.keyword || 
      (tasker.fullName?.toLowerCase().includes(filter.keyword.toLowerCase()) || 
       tasker.phone?.includes(filter.keyword));
    return matchStatus && matchKeyword;
  });

  const displayData = isUsingMock 
    ? filteredMockData.slice((filter.page - 1) * filter.limit, filter.page * filter.limit) 
    : response?.data || [];
    
  const totalItems = isUsingMock 
    ? filteredMockData.length 
    : (response?.meta?.total || response?.data?.length || 0);

  // ─── Columns ───
  const columns: Column<TaskerProfile>[] = [
    {
      key: "fullName",
      title: "Ứng viên",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {row.fullName?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-semibold text-sm">{row.fullName || "Chưa cập nhật"}</p>
            <p className="text-xs text-muted-foreground">{row.phone || "N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "experience",
      title: "Kinh nghiệm",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-foreground/80 max-w-[200px] truncate block">
          {row.experience || "Chưa có"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày đăng ký",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => {
        const styleMap = {
          [TaskerStatus.APPROVED]: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
          [TaskerStatus.PENDING]: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
          [TaskerStatus.NEED_INFO]: "bg-blue-500/10 text-blue-700 border-blue-500/20",
          [TaskerStatus.REJECTED]: "bg-red-500/10 text-red-700 border-red-500/20",
        };
        const iconMap = {
          [TaskerStatus.APPROVED]: <CheckCircle className="w-3 h-3 mr-1" />,
          [TaskerStatus.PENDING]: <Clock className="w-3 h-3 mr-1" />,
          [TaskerStatus.NEED_INFO]: <Info className="w-3 h-3 mr-1" />,
          [TaskerStatus.REJECTED]: <XCircle className="w-3 h-3 mr-1" />,
        };
        const labelMap = {
          [TaskerStatus.APPROVED]: "Đã duyệt",
          [TaskerStatus.PENDING]: "Chờ duyệt",
          [TaskerStatus.NEED_INFO]: "Cần bổ sung",
          [TaskerStatus.REJECTED]: "Từ chối",
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${styleMap[row.approvalStatus as TaskerStatus] || styleMap[TaskerStatus.PENDING]}`}>
            {iconMap[row.approvalStatus as TaskerStatus] || <Clock className="w-3 h-3 mr-1" />}
            {labelMap[row.approvalStatus as TaskerStatus] || "Chưa rõ"}
          </span>
        );
      },
    },
  ];

  // ─── Row Actions ───
  const rowActions: RowAction<TaskerProfile>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setSelectedTaskerId(row.id),
    },
    {
      type: "approve",
      label: "Duyệt hồ sơ",
      icon: CheckCircle,
      onClick: (row) => approveMutation.mutate(row.id),
      hidden: (row) => row.approvalStatus !== TaskerStatus.PENDING && row.approvalStatus !== TaskerStatus.NEED_INFO,
    },
    {
      label: "Yêu cầu bổ sung",
      icon: Info,
      onClick: (row) => setReviewModal({ isOpen: true, taskerId: row.id, type: "request_info" }),
      hidden: (row) => row.approvalStatus !== TaskerStatus.PENDING && row.approvalStatus !== TaskerStatus.NEED_INFO,
    },
    {
      label: "Từ chối",
      icon: XCircle,
      variant: "destructive",
      onClick: (row) => setReviewModal({ isOpen: true, taskerId: row.id, type: "reject" }),
      hidden: (row) => row.approvalStatus !== TaskerStatus.PENDING && row.approvalStatus !== TaskerStatus.NEED_INFO,
    },
  ];

  // ─── Bulk Actions ───
  const bulkActions: BulkAction<TaskerProfile>[] = [
    {
      label: "Duyệt tất cả đã chọn",
      icon: CheckCircle,
      onClick: (rows) => {
        const pendingRows = rows.filter(r => r.approvalStatus === TaskerStatus.PENDING || r.approvalStatus === TaskerStatus.NEED_INFO);
        if (pendingRows.length === 0) {
          toast.info("Không có hồ sơ nào hợp lệ để duyệt trong danh sách chọn.");
          return;
        }
        // Gọi mutate cho từng row, nếu backend hỗ trợ duyệt hàng loạt thì đổi sang API đó
        pendingRows.forEach((row) => approveMutation.mutate(row.id));
        toast.success(`Đã gửi yêu cầu duyệt ${pendingRows.length} hồ sơ.`);
      },
      variant: "default",
    },
    {
      label: "Từ chối đã chọn",
      icon: Trash2,
      onClick: (rows) => {
        // Có thể hiện một modal gộp chung lý do, hoặc reject trực tiếp
        toast.info("Tính năng từ chối hàng loạt đang phát triển.");
      },
      variant: "destructive",
    },
  ];

  return (
    <>
      <BaseTableList
        columns={columns}
        data={displayData}
        rowKey="id"
        totalItems={totalItems}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter(prev => ({ ...prev, page }))}
        onLimitChange={(limit) => setFilter(prev => ({ ...prev, limit, page: 1 }))}
        keyword={filter.keyword}
        onKeywordChange={(keyword) => setFilter(prev => ({ ...prev, keyword, page: 1 }))}
        placeholderSearch="Tìm tên, số điện thoại..."
        isLoading={isLoading || approveMutation.isPending}
        emptyTitle="Không có hồ sơ nhân viên"
        emptyDescription="Danh sách nhân viên trống hoặc không có hồ sơ nào khớp với bộ lọc của bạn."
        onSelectionChange={setSelectedTaskers}
        rowActions={rowActions}
        bulkActions={bulkActions}
        inlineActionCount={2}
        filters={
          <Select 
            value={filter.status} 
            onValueChange={(val) => setFilter(prev => ({ ...prev, status: val as TaskerStatus | "ALL", page: 1 }))}
          >
            <SelectTrigger className="h-11 min-w-[160px] rounded-xl border-border/60 bg-background text-sm font-medium focus:ring-primary/20">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">
                <div className="flex items-center gap-2"><ListFilter className="w-4 h-4 opacity-70" /> Tất cả trạng thái</div>
              </SelectItem>
              <SelectItem value={TaskerStatus.PENDING}>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 opacity-70" /> Chờ duyệt</div>
              </SelectItem>
              <SelectItem value={TaskerStatus.APPROVED}>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 opacity-70" /> Đã duyệt</div>
              </SelectItem>
              <SelectItem value={TaskerStatus.NEED_INFO}>
                <div className="flex items-center gap-2"><Info className="w-4 h-4 opacity-70" /> Cần bổ sung</div>
              </SelectItem>
              <SelectItem value={TaskerStatus.REJECTED}>
                <div className="flex items-center gap-2"><XCircle className="w-4 h-4 opacity-70" /> Từ chối</div>
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {selectedTaskerId && (
        <TaskerDetailModal 
          taskerId={selectedTaskerId} 
          isOpen={!!selectedTaskerId} 
          onClose={() => setSelectedTaskerId(null)} 
        />
      )}

      <AdminReviewModal 
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
        title={reviewModal.type === "reject" ? "Từ chối hồ sơ" : "Yêu cầu bổ sung thông tin"}
        description={reviewModal.type === "reject" 
          ? "Vui lòng cho biết lý do bạn từ chối hồ sơ này. Nhân viên sẽ nhận được thông báo này." 
          : "Vui lòng mô tả chi tiết những thông tin hoặc giấy tờ mà nhân viên cần cập nhật thêm."
        }
        isLoading={rejectMutation.isPending || requestInfoMutation.isPending}
        onConfirm={(notes) => {
          if (reviewModal.type === "reject") {
            rejectMutation.mutate({ id: reviewModal.taskerId, notes }, {
              onSuccess: () => setReviewModal(prev => ({ ...prev, isOpen: false }))
            });
          } else {
            requestInfoMutation.mutate({ id: reviewModal.taskerId, notes }, {
              onSuccess: () => setReviewModal(prev => ({ ...prev, isOpen: false }))
            });
          }
        }}
      />
    </>
  );
};
