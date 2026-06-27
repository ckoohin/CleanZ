"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MISSING_ITEM_OPTIONS,
  serializeAdminNotes,
  parseAdminNotes,
  buildReviewParts,
  getReviewPartMap,
} from "@/lib/kyc/review-notes";
import type { MissingItem, AdminNotesData, ReviewPart } from "@/lib/kyc/review-notes";

// Contract serialize/parse được giữ tập trung ở "@/lib/kyc/review-notes".
// Re-export để các import cũ (parseAdminNotes, serializeAdminNotes, ...) vẫn hoạt động.
export {
  MISSING_ITEM_OPTIONS,
  serializeAdminNotes,
  parseAdminNotes,
  buildReviewParts,
  getReviewPartMap,
};
export type { MissingItem, AdminNotesData, ReviewPart };

const CATEGORY_ORDER = ["Giấy tờ", "Thông tin cá nhân", "Thanh toán", "Nghề nghiệp"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  "Giấy tờ": "bg-orange-500/10 border-orange-500/20 text-orange-700",
  "Thông tin cá nhân": "bg-blue-500/10 border-blue-500/20 text-blue-700",
  "Thanh toán": "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
  "Nghề nghiệp": "bg-purple-500/10 border-purple-500/20 text-purple-700",
};

// ─── Modal Component ─────────────────────────────────────────────────────────

interface AdminRequestInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  isLoading?: boolean;
  /** Pre-checked items based on what's missing in profile */
  suggestedItems?: string[];
}

export const AdminRequestInfoModal: React.FC<AdminRequestInfoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  suggestedItems = [],
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(suggestedItems));
  const [note, setNote] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (categoryItems: MissingItem[]) => {
    const ids = categoryItems.map((i) => i.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleConfirm = () => {
    const serialized = serializeAdminNotes([...selected], note.trim());
    onConfirm(serialized);
  };

  const canConfirm = selected.size > 0;

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: MISSING_ITEM_OPTIONS.filter((o) => o.category === cat),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" aria-hidden="true" />
            Yêu cầu bổ sung thông tin
          </DialogTitle>
          <DialogDescription>
            Chọn các mục nhân viên cần bổ sung. Danh sách này sẽ hiển thị trực tiếp trên giao diện của họ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Checklist by category */}
          {grouped.map(({ category, items }) => {
            const allChecked = items.every((i) => selected.has(i.id));
            const someChecked = items.some((i) => selected.has(i.id));
            return (
              <div key={category} className="space-y-2">
                {/* Category header with select-all */}
                <button
                  type="button"
                  onClick={() => toggleAll(items)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  {allChecked ? (
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  ) : someChecked ? (
                    <CheckSquare className="w-4 h-4 text-primary/50 shrink-0" aria-hidden="true" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {category}
                  </span>
                </button>

                {/* Items */}
                <div className="grid grid-cols-1 gap-1.5 pl-6">
                  {items.map((item) => {
                    const isChecked = selected.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        className={cn(
                          "flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all text-sm",
                          isChecked
                            ? cn(CATEGORY_COLORS[category], "shadow-sm")
                            : "border-border bg-background hover:bg-muted/50"
                        )}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <Square className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
                        )}
                        <div>
                          <p className="font-semibold leading-tight">{item.label}</p>
                          {item.description && (
                            <p className="text-xs opacity-70 mt-0.5">{item.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Selected summary */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">
                    Đã chọn {selected.size} mục
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...selected].map((id) => {
                      const item = MISSING_ITEM_OPTIONS.find((o) => o.id === id);
                      return (
                        <Badge key={id} variant="outline" className="text-xs bg-background">
                          {item?.label ?? id}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Additional notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Ghi chú thêm <span className="font-normal normal-case">(tùy chọn)</span>
            </label>
            <Textarea
              placeholder="VD: Ảnh CCCD bị mờ, vui lòng chụp lại với ánh sáng tốt hơn..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded-xl resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />Đang gửi...</>
            ) : (
              `Gửi yêu cầu (${selected.size})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
