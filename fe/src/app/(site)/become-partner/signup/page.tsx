import React from "react";
import { PartnerSignupWizard } from "@/features/staff/_components/PartnerSignupWizard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký làm Đối tác CleanZ | Tạo tài khoản & Nộp hồ sơ",
  description: "Tạo tài khoản và hoàn thiện hồ sơ đối tác dọn dẹp chuyên nghiệp của CleanZ trong vài bước đơn giản.",
};

export default function PartnerSignupPage() {
  return (
    <main className="bg-background">
      <PartnerSignupWizard />
    </main>
  );
}
