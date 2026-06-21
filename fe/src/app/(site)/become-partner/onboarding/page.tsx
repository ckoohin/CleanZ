import React from "react";
import { Metadata } from "next";
import { TaskerRegistrationWizard } from "@/features/tasker/_components/TaskerRegistrationWizard";

export const metadata: Metadata = {
  title: "Hoàn thiện hồ sơ Đối tác | CleanZ",
  description: "Điền thông tin, tải tài liệu pháp lý và chờ Admin xét duyệt hồ sơ đối tác CleanZ.",
};

export default function PartnerOnboardingPage() {
  return (
    <main className="bg-background">
      <TaskerRegistrationWizard />
    </main>
  );
}
