"use client";

import React from "react";
import { StaffRegistrationWizard } from "@/features/staffs/_components/StaffRegistrationWizard";

export default function StaffOnboardingPage() {
  return (
    <div className="w-full min-h-screen bg-slate-50/50 dark:bg-slate-950/20">
      <StaffRegistrationWizard />
    </div>
  );
}
