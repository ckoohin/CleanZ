'use client';

import React from 'react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';

/**
 * Hiệu ứng chuyển trang toàn cục.
 *
 * KHÔNG dùng AnimatePresence ở đây. `template.tsx` của Next.js được cấp key mới
 * và REMOUNT mỗi lần điều hướng, nên AnimatePresence không bao giờ thấy child
 * "đang thoát" → exit animation không chạy được. Ngược lại `mode="wait"` vẫn
 * giữ child mới lại chờ exit hoàn tất; nếu người dùng bấm sang mục khác trước
 * khi chu kỳ đó xong (và với /tasker còn bị lồng thêm một AnimatePresence
 * mode="wait" nữa trong layout), state máy animation có thể kẹt ở trạng thái
 * không render child nào → TRẮNG MÀN HÌNH mà không có lỗi nào trong console.
 *
 * Vì template remount, chỉ cần `initial` → `animate` là hiệu ứng vào vẫn chạy
 * đúng như trước, không mất gì.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith('/admin') || pathname.startsWith('/customer')) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.19, 1, 0.22, 1],
      }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
