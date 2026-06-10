"use client";

import { Suspense } from "react";
import { TaskerAuthPage } from "@/features/tasker/_components/TaskerAuthPage";

export default function TaskerLoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-white">Loading...</div>}>
      <TaskerAuthPage />
    </Suspense>
  );
}
