"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { TaskerSidebar } from "@/features/tasker/_components/TaskerSidebar";
import { useTaskerProfile, useUpdatePresence } from "@/features/tasker/hooks/tasker.hooks";
import { useTaskerActionGuard } from "@/features/tasker/hooks/useTaskerActionGuard";
import RoleGuard from "@/features/auth/_components/authv1/RoleGuard";
import { ActiveJobWidget } from "@/features/booking/components/ActiveJobWidget";

// Page transition variants — slide nhẹ từ phải sang trái (kiểu native app)
const PAGE_VARIANTS = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
};

const PAGE_TRANSITION = {
  type: "tween" as const,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], // ease-out-quart
  duration: 0.22,
};

export default function TaskerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: tasker } = useTaskerProfile();
  const guard = useTaskerActionGuard(tasker);
  const updatePresence = useUpdatePresence();
  const hasLockBanner = Boolean(
    tasker?.status === "SUSPENDED" ||
      tasker?.status === "TERMINATED" ||
      (tasker?.cancelSuspendedUntil &&
        new Date(tasker.cancelSuspendedUntil).getTime() > Date.now())
  );

  const handleToggleOnline = () => {
    guard.requireVerified(() => {
      const currentStatus = tasker?.presenceStatus;
      const newStatus = currentStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
      updatePresence.mutate(newStatus);
    });
  };

  return (
    <RoleGuard allowedRoles={["TASKER"]}>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar nằm NGOÀI AnimatePresence -> position: fixed hoạt động đúng chuẩn viewport, không bị transform đè */}
        <TaskerSidebar onToggleOnline={handleToggleOnline} />

        {/* Main content area */}
        <main
          className={`flex-1 min-w-0 ${hasLockBanner ? "pt-28" : "pt-14"} lg:pt-0 pb-24 lg:pb-0 relative overflow-x-hidden`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={PAGE_TRANSITION}
              style={{ willChange: "opacity, transform" }}
              className="w-full">
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Khôi phục và định vị Widget theo dõi công việc hoạt động chuẩn xác theo viewport toàn màn hình */}
        <ActiveJobWidget />
      </div>
    </RoleGuard>
  );
}
