"use client";

import { TaskerAuthPage } from "@/features/tasker/_components/TaskerAuthPage";
import { useEffect } from "react";

export default function RegisterTaskerPage() {
  return <TaskerAuthPage forceTab="register" />;
}
