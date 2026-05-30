"use client";

import React from "react";
import { StaffApprovalTable } from "@/features/admin-staffs/_components/StaffApprovalTable";
import { Users, ShieldCheck } from "lucide-react";

export default function StaffVerificationPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col gap-2 mb-10">
        <div className="flex items-center gap-3 text-primary">
          <ShieldCheck className="w-8 h-8" />
          <span className="font-bold tracking-widest uppercase text-sm">Hệ thống quản trị</span>
        </div>
        <h1 className="text-4xl font-bold font-serif">Xác minh hồ sơ nhân viên</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Kiểm tra và phê duyệt các yêu cầu trở thành đối tác. Hãy đảm bảo thông tin cá nhân và giấy tờ định danh là chính xác.
        </p>
      </div>

      <div className="bg-background rounded-[2.5rem] border shadow-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold font-serif">Danh sách ứng viên</h2>
        </div>
        
        <StaffApprovalTable />
      </div>
    </div>
  );
}
