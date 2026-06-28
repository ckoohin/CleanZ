"use client";

import { SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUpVariants } from "@/constants/motion";

interface CatalogEmptyStateProps {
  searchQuery?: string;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export const CatalogEmptyState = ({
  searchQuery,
  hasActiveFilters,
  onResetFilters,
}: CatalogEmptyStateProps) => {
  return (
    <motion.div
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
        <SearchX className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-foreground">
        {searchQuery
          ? `Không tìm thấy gói dịch vụ cho "${searchQuery}"`
          : "Chưa có gói dịch vụ nào"}
      </h3>

      <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
        {hasActiveFilters
          ? "Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem thêm kết quả."
          : "Hãy quay lại sau, chúng tôi sẽ cập nhật gói dịch vụ sớm nhất."}
      </p>

      {hasActiveFilters && (
        <button
          onClick={onResetFilters}
          className="mt-4 h-9 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Đặt lại bộ lọc
        </button>
      )}
    </motion.div>
  );
};
