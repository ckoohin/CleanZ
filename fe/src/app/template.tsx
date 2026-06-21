'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Bỏ qua hiệu ứng template gốc cho các route admin để tránh việc re-mount toàn bộ Admin Layout
  // (Giúp Sidebar và Header không bị chớp/loading lại toàn trang)
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.19, 1, 0.22, 1] 
        }}
        className="w-full flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
