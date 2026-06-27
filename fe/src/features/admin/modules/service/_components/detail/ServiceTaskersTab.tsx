import React, { useState } from "react";
import { useServiceTaskers } from "@/features/admin/modules/service/hooks/useAdminServices";
import { Loader2, Search, Star } from "lucide-react";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ServiceTaskersTabProps {
  serviceId: string;
}

export function ServiceTaskersTab({ serviceId }: ServiceTaskersTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useServiceTaskers(serviceId, { page, limit: 10 });

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--c-primary-strong)] animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-10">
        <BaseEmptyState title="Lỗi tải dữ liệu" description="Không thể tải danh sách nhân sự lúc này." />
      </div>
    );
  }

  const taskers = data.items;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-[var(--c-ink)]">Nhân sự phục vụ ({data.total})</h3>
          <p className="text-sm text-[var(--c-muted)] mt-1">Các nhân sự đã từng hoàn thành đơn của dịch vụ này.</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" />
          <Input placeholder="Tìm kiếm nhân sự..." className="pl-9 bg-[var(--c-card)] rounded-xl" />
        </div>
      </div>

      <div className="border border-[var(--c-line)]/50 rounded-2xl overflow-hidden bg-[var(--c-card)] shadow-sm">
        <Table>
          <TableHeader className="bg-[var(--c-card-2)]">
            <TableRow>
              <TableHead className="font-bold">Nhân sự</TableHead>
              <TableHead className="font-bold">Số điện thoại</TableHead>
              <TableHead className="font-bold text-center">Trạng thái</TableHead>
              <TableHead className="font-bold text-center">Đánh giá</TableHead>
              <TableHead className="font-bold text-center">Tổng công việc</TableHead>
              <TableHead className="font-bold text-right text-[var(--c-primary-strong)]">Việc đã nhận (Dịch vụ này)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-[var(--c-muted)]">
                  Chưa có nhân sự nào làm dịch vụ này
                </TableCell>
              </TableRow>
            ) : (
              taskers.map((tasker) => (
                <TableRow key={tasker.id} className="hover:bg-[var(--c-card-2)] transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-[var(--c-line)]">
                        <AvatarImage src={tasker.avatarUrl || ""} alt={tasker.fullName} />
                        <AvatarFallback className="bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] font-bold">
                          {tasker.fullName?.charAt(0) || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium text-[var(--c-ink)]">{tasker.fullName}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[var(--c-muted)]">{tasker.phoneNumber}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      tasker.presenceStatus === 'ONLINE' ? 'bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]' : 
                      tasker.presenceStatus === 'BUSY' ? 'bg-[rgba(217,119,6,0.14)] text-[#D97706]' : 'bg-[var(--c-card-2)] text-[var(--c-muted)]'
                    }`}>
                      {tasker.presenceStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <Star className="w-4 h-4 fill-[#D97706] text-[#D97706]" />
                      <span>{Number(tasker.ratingAvg).toFixed(1)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {tasker.totalCompletedJobs}
                  </TableCell>
                  <TableCell className="text-right font-bold text-[var(--c-primary-strong)] text-lg">
                    {tasker.jobsForThisService}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Basic Pagination */}
      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 text-sm font-medium hover:bg-[var(--c-card-2)]"
          >
            Trang trước
          </button>
          <span className="px-4 py-2 text-sm font-medium">Trang {page} / {data.totalPages}</span>
          <button 
            disabled={page === data.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 text-sm font-medium hover:bg-[var(--c-card-2)]"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}
