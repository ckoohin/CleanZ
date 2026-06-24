"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUpVariants } from "@/constants/motion";

interface CatalogErrorStateProps {
  onRetry: () => void;
}

export const CatalogErrorState = ({ onRetry }: CatalogErrorStateProps) => {
  return (
    <motion.div
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-foreground">
        Không thể tải danh sách dịch vụ
      </h3>

      <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
        Đã có lỗi xảy ra khi kết nối. Vui lòng kiểm tra mạng và thử lại.
      </p>

      <button
        onClick={onRetry}
        className="mt-4 inline-flex h-9 items-center gap-2 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Thử lại
      </button>
    </motion.div>
  );
};
