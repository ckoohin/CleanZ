"use client";

import { CreditCard, Trash2 } from "lucide-react";

/** Khớp cấu trúc cả `SavedCard` (customer) lẫn `TaskerSavedCard` (tasker). */
export interface SavedCardLike {
  id: string;
  brand: string | null;
  lastFour: string | null;
}

interface SavedCardPickerProps {
  cards: SavedCardLike[] | undefined;
  /** Id thẻ đang chọn, hoặc "new" nếu chọn nhập thẻ mới. */
  selectedId: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  isRemoving?: boolean;
  pickerLabel?: string;
  newCardLabel?: string;
  emptyHint?: string;
}

/**
 * Danh sách thẻ Adyen đã lưu (radio + xóa) + option nhập thẻ mới. Dùng chung
 * cho mọi nơi cần chọn thẻ trước khi thanh toán (hiện tại: booking checkout).
 */
export function SavedCardPicker({
  cards,
  selectedId,
  onSelect,
  onRemove,
  isRemoving = false,
  pickerLabel = "Thanh toán bằng",
  newCardLabel = "+ Dùng thẻ khác (nhập ở bước tiếp theo, sẽ được lưu)",
  emptyHint = "Bạn sẽ nhập thông tin thẻ ở bước tiếp theo (sandbox). Thẻ được lưu lại để lần sau chỉ cần chọn.",
}: SavedCardPickerProps) {
  if (!cards || cards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        {emptyHint}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-foreground/80">{pickerLabel}</p>
      {cards.map((card) => (
        <div
          key={card.id}
          className={`flex items-center gap-2 rounded-xl border p-2.5 transition-colors ${
            selectedId === card.id
              ? "border-primary bg-primary/5"
              : "border-border/50 hover:border-primary/30"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(card.id)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <CreditCard className="size-4 shrink-0 text-primary" />
            <span className="font-mono text-sm font-semibold">
              {card.brand ?? "Thẻ đã lưu"} •••• {card.lastFour ?? ""}
            </span>
          </button>
          <button
            type="button"
            aria-label="Xóa thẻ"
            onClick={() => {
              if (selectedId === card.id) onSelect("new");
              onRemove(card.id);
            }}
            disabled={isRemoving}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onSelect("new")}
        className={`w-full rounded-xl border p-2.5 text-left text-sm transition-colors ${
          selectedId === "new"
            ? "border-primary bg-primary/5 font-semibold"
            : "border-dashed border-border text-muted-foreground hover:border-primary/30"
        }`}
      >
        {newCardLabel}
      </button>
    </div>
  );
}
