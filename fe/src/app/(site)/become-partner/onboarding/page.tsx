import React from "react";
import dynamic from "next/dynamic";
import { Metadata } from "next";
import TopLoadingBar from "@/components/loadings/TopLoadingBar";

export const metadata: Metadata = {
  title: "Hoàn thiện hồ sơ Đối tác | CleanZ",
  description: "Điền thông tin, tải tài liệu pháp lý và chờ Admin xét duyệt hồ sơ đối tác CleanZ.",
};

const PartnerOnboardingWizard = dynamic(
  () => import("@/features/tasker/_components/PartnerOnboardingWizard").then(m => m.PartnerOnboardingWizard),
  {
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <TopLoadingBar />
      </div>
    )
  }
);

export default function PartnerOnboardingPage() {
  return (
    <main className="bg-background">
      <PartnerOnboardingWizard />
    </main>
  );
}
