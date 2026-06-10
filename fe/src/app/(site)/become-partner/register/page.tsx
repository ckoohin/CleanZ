import React from "react";
import { TaskerRegistrationWizard } from "@/features/tasker/_components/TaskerRegistrationWizard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký làm đối tác | CleanZ",
  description: "Hoàn tất hồ sơ để gia nhập đội ngũ chuyên gia CleanZ.",
};

export default function TaskerRegisterPage() {
  return (
    <main className="bg-background">
      <TaskerRegistrationWizard />
    </main>
  );
}
