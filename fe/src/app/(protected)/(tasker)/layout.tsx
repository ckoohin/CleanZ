"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { TaskerSidebar } from "@/features/tasker/_components/TaskerSidebar";
import {
  useTaskerLocationHeartbeat,
  useTaskerProfile,
  useUpdatePresence,
} from "@/features/tasker/hooks/tasker.hooks";
import { useTaskerActionGuard } from "@/features/tasker/hooks/useTaskerActionGuard";
import RoleGuard from "@/features/auth/_components/authv1/RoleGuard";
import { ActiveJobWidget } from "@/features/booking/components/ActiveJobWidget";
import { TaskerRealtimeDispatch } from "@/features/tasker/_components/TaskerRealtimeDispatch";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

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
  const [now, setNow] = useState(() => Date.now());
  const { data: tasker } = useTaskerProfile();
  const guard = useTaskerActionGuard(tasker);
  const updatePresence = useUpdatePresence();
  useTaskerLocationHeartbeat(tasker);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const hasLockBanner = Boolean(
    tasker?.status === "SUSPENDED" ||
      tasker?.status === "TERMINATED" ||
      (tasker?.cancelSuspendedUntil &&
        new Date(tasker.cancelSuspendedUntil).getTime() > now)
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
          {/* KHÔNG dùng AnimatePresence mode="wait" ở đây.
              `mode="wait"` giữ trang mới lại cho tới khi trang cũ chạy xong exit;
              nếu tasker vuốt đổi trạng thái rồi bấm nhanh sang mục khác, key đổi
              liên tiếp giữa lúc exit chưa xong và máy trạng thái animation có thể
              kẹt ở chỗ không render child nào → trắng vùng nội dung mà KHÔNG có
              lỗi nào trong console.
              `key={pathname}` là đủ: React remount nên initial → animate vẫn chạy
              hiệu ứng vào, và không còn cửa sổ nào để bị kẹt. */}
          <motion.div
            key={pathname}
            variants={PAGE_VARIANTS}
            initial="initial"
            animate="animate"
            transition={PAGE_TRANSITION}
            style={{ willChange: "opacity, transform" }}
            className="w-full"
          >
            {children}
          </motion.div>
        </main>

        {/* Khôi phục và định vị Widget theo dõi công việc hoạt động chuẩn xác theo viewport toàn màn hình.
            Bọc ErrorBoundary như layout khách: 2 component này nằm TRONG layout nên
            nếu chúng ném lỗi thì error.tsx của segment con không bắt được, lỗi sẽ
            bung tới global-error và làm trắng cả trang tasker. */}
        <ErrorBoundary fallback={null}>
          <ActiveJobWidget />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <TaskerRealtimeDispatch />
        </ErrorBoundary>
      </div>
    </RoleGuard>
  );
}
