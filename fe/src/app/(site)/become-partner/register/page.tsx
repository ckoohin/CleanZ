import React from "react";
import { StaffRegistrationWizard } from "@/features/staffs/_components/StaffRegistrationWizard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký làm đối tác | CleanZ",
  description: "Hoàn tất hồ sơ để gia nhập đội ngũ chuyên gia CleanZ.",
};

export default function StaffRegisterPage() {
  return (
    <main className="bg-background">
      <StaffRegistrationWizard />
    </main>
  );
}
