"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBlob } from "../lib/download";

export interface ExportExcelButtonProps {
  onExport: () => Promise<Blob>;
  filenamePrefix: string;
  label?: string;
  className?: string;
}

/** Nút "Xuất Excel" dùng chung — gọi API trả blob rồi tải file .xlsx về máy. */
export function ExportExcelButton({ onExport, filenamePrefix, label = "Xuất Excel", className }: ExportExcelButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const blob = await onExport();
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `${filenamePrefix}_${date}.xlsx`);
    } catch {
      // Không toast ở đây: interceptor của http đã hiện đúng lý do (hết phiên,
      // không đủ quyền, quá số lần cho phép trong phút…). Thêm một câu "Xuất
      // Excel thất bại" nữa chỉ tạo 2 toast chồng nhau và làm loãng câu có ích.
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50 disabled:pointer-events-none",
        "text-[#0E9F6E] bg-[#0E9F6E]/10 border-[#0E9F6E]/25 hover:bg-[#0E9F6E]/20 hover:border-[#0E9F6E]/40",
        className,
      )}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
