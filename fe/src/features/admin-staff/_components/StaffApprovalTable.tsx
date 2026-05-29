"use client";

import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  useAdminStaff, 
  useApproveStaff, 
  useRejectStaff,
  useRequestMoreInfoStaff
} from "../hooks/admin-staff.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Check, X, Search } from "lucide-react";
import { StaffStatus } from "@/features/staff/types/staff.type";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { StaffDetailModal } from "./StaffDetailModal";
import { AdminReviewModal } from "./AdminReviewModal";
import { Info } from "lucide-react";

export const StaffApprovalTable: React.FC = () => {
  const [filter, setFilter] = useState({
    status: StaffStatus.PENDING,
    keyword: "",
    page: 1,
    limit: 10
  });

  const { data: response, isLoading } = useAdminStaff(filter);
  const approveMutation = useApproveStaff();
  const rejectMutation = useRejectStaff();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    staffId: string;
    type: "reject" | "request_info";
  }>({
    isOpen: false,
    staffId: "",
    type: "reject"
  });

  const requestInfoMutation = useRequestMoreInfoStaff();

  const getStatusBadge = (status: StaffStatus) => {
    switch (status) {
      case StaffStatus.APPROVED: return <Badge className="bg-green-500 hover:bg-green-600">Đã duyệt</Badge>;
      case StaffStatus.REJECTED: return <Badge variant="destructive">Từ chối</Badge>;
      case StaffStatus.NEED_INFO: return <Badge className="bg-blue-500 text-white hover:bg-blue-600">Cần bổ sung</Badge>;
      default: return <Badge variant="secondary" className="bg-yellow-500 text-white hover:bg-yellow-600">Chờ duyệt</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1 w-full">
          <div className="w-full max-w-sm space-y-2">
            <label className="text-sm font-medium">Tìm kiếm nhân viên</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Tên hoặc số điện thoại..." 
                className="pl-10 h-11"
                value={filter.keyword}
                onChange={(e) => setFilter(prev => ({ ...prev, keyword: e.target.value }))}
              />
            </div>
          </div>
          <div className="w-40 space-y-2">
            <label className="text-sm font-medium">Trạng thái</label>
            <Select 
              value={filter.status} 
              onValueChange={(val) => setFilter(prev => ({ ...prev, status: val as StaffStatus }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={StaffStatus.PENDING}>Chờ duyệt</SelectItem>
                <SelectItem value={StaffStatus.APPROVED}>Đã duyệt</SelectItem>
                <SelectItem value={StaffStatus.REJECTED}>Từ chối</SelectItem>
                <SelectItem value={StaffStatus.NEED_INFO}>Cần bổ sung</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Họ tên</TableHead>
              <TableHead className="font-bold">Số điện thoại</TableHead>
              <TableHead className="font-bold">Kinh nghiệm</TableHead>
              <TableHead className="font-bold">Ngày đăng ký</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="font-bold text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Đang tải dữ liệu...</TableCell></TableRow>
            ) : response?.data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Không tìm thấy hồ sơ nào.</TableCell></TableRow>
            ) : (
              response?.data.map((staff) => (
                <TableRow key={staff.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{(staff as any).fullName || "Chưa cập nhật"}</TableCell>
                  <TableCell>{staff.phone || "N/A"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{staff.experience}</TableCell>
                  <TableCell>{new Date((staff as any).createdAt).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>{getStatusBadge(staff.approvalStatus)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="rounded-full"
                        onClick={() => setSelectedStaffId(staff.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(staff.approvalStatus === StaffStatus.PENDING || staff.approvalStatus === StaffStatus.NEED_INFO) && (
                        <>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title="Phê duyệt"
                            className="rounded-full text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => approveMutation.mutate(staff.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title="Yêu cầu bổ sung thông tin"
                            className="rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => setReviewModal({ isOpen: true, staffId: staff.id, type: "request_info" })}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title="Từ chối hồ sơ"
                            className="rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setReviewModal({ isOpen: true, staffId: staff.id, type: "reject" })}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedStaffId && (
        <StaffDetailModal 
          staffId={selectedStaffId} 
          isOpen={!!selectedStaffId} 
          onClose={() => setSelectedStaffId(null)} 
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
            rejectMutation.mutate({ id: reviewModal.staffId, notes }, {
              onSuccess: () => setReviewModal(prev => ({ ...prev, isOpen: false }))
            });
          } else {
            requestInfoMutation.mutate({ id: reviewModal.staffId, notes }, {
              onSuccess: () => setReviewModal(prev => ({ ...prev, isOpen: false }))
            });
          }
        }}
      />
    </div>
  );
};
