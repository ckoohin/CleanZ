import React from "react";
import { BookingFormState } from "@/features/booking/types/booking.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, MessageSquare, Cat, Baby, DoorOpen } from "lucide-react";

interface StepNotesProps {
  formData: BookingFormState;
  updateForm: (data: Partial<BookingFormState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepNotes: React.FC<StepNotesProps> = ({ formData, updateForm, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Ghi chú thêm (Tùy chọn)</h2>
        <p className="text-muted-foreground text-sm">Chia sẻ thêm thông tin để chuyên gia chuẩn bị tốt nhất.</p>
      </div>

      <div className="flex-1 space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Nội dung ghi chú
          </label>
          <Textarea 
            placeholder="Ví dụ: Nhà có mèo con, vui lòng không dùng hóa chất mạnh. Hoặc: Để chìa khóa dưới thảm..."
            className="min-h-[150px] resize-none bg-muted/40 border-border/50 rounded-2xl focus-visible:ring-primary/20 focus-visible:bg-background p-4 font-semibold transition-all duration-300"
            value={formData.note}
            onChange={(e) => updateForm({ note: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground/80 block">Gợi ý nhanh:</label>
          <div className="flex flex-wrap gap-2.5">
            <button 
              type="button"
              onClick={() => updateForm({ note: (formData.note + " Nhà có nuôi chó/mèo.").trim() })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border/50 text-xs font-bold text-foreground/80 hover:bg-primary/5 hover:border-primary/30 hover:text-primary active:scale-95 transition-all shadow-sm"
            >
              <Cat className="w-4 h-4 text-orange-500" /> Thú cưng 🐾
            </button>
            <button 
              type="button"
              onClick={() => updateForm({ note: (formData.note + " Có trẻ sơ sinh, cần yên tĩnh.").trim() })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border/50 text-xs font-bold text-foreground/80 hover:bg-primary/5 hover:border-primary/30 hover:text-primary active:scale-95 transition-all shadow-sm"
            >
              <Baby className="w-4 h-4 text-sky-500" /> Trẻ nhỏ 👶
            </button>
            <button 
              type="button"
              onClick={() => updateForm({ note: (formData.note + " Tôi sẽ mở cửa sẵn.").trim() })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border/50 text-xs font-bold text-foreground/80 hover:bg-primary/5 hover:border-primary/30 hover:text-primary active:scale-95 transition-all shadow-sm"
            >
              <DoorOpen className="w-4 h-4 text-emerald-500" /> Cửa nẻo 🚪
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row justify-between gap-3">
        <Button 
          variant="outline"
          onClick={onBack}
          className="h-14 w-full sm:w-auto px-6 rounded-2xl border-border/60 font-bold hover:bg-muted text-foreground/90 active:scale-95 transition-all order-2 sm:order-1"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Quay lại
        </Button>
        <Button 
          onClick={onNext}
          className="h-14 w-full sm:w-auto px-8 rounded-2xl bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 text-primary-foreground font-bold shadow-lg shadow-primary/20 text-base active:scale-95 transition-all order-1 sm:order-2"
        >
          Tới thanh toán
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
