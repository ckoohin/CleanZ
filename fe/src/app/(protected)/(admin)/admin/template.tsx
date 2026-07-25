'use client';

import React from 'react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';

/**
 * Hiệu ứng chuyển trang cho khu vực quản trị.
 *
 * KHÔNG dùng AnimatePresence: `template.tsx` remount mỗi lần điều hướng nên
 * exit animation không bao giờ chạy, trong khi `mode="wait"` lại có thể giữ
 * child mới không mount khi người dùng bấm liên tiếp → trắng vùng nội dung mà
 * không có lỗi console. Chi tiết xem chú thích ở `src/app/template.tsx`.
 */
export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.19, 1, 0.22, 1],
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
