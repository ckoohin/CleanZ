/**
 * ⚠️ DEAD CODE — không có route/page nào import từ thư mục
 * `features/booking/components/wizard/` (xác nhận bằng grep toàn repo, 2026-07).
 * Route /customer/booking thực tế dùng `features/customer/booking/components/BookingWizard.tsx`.
 * Giữ lại để tham khảo, cân nhắc xóa nếu chắc chắn không còn cần.
 */
import React, { useState, useMemo, useEffect } from "react";
import { BookingFormState } from "@/features/booking/types/booking.types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ArrowRight, ArrowLeft, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useIsMobile } from "@/components/ui/use-mobile";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription
} from "@/components/ui/drawer";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";

interface StepDateTimeProps {
  formData: BookingFormState;
  updateForm: (data: Partial<BookingFormState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

const HOURS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export const StepDateTime: React.FC<StepDateTimeProps> = ({ formData, updateForm, onNext, onBack }) => {
  const [error, setError] = useState("");
  const isMobile = useIsMobile();
  const [isDateDrawerOpen, setIsDateDrawerOpen] = useState(false);
  const [isTimeDrawerOpen, setIsTimeDrawerOpen] = useState(false);

  // Derive (tính toán trực tiếp) customHour và customMinute từ formData.scheduledTime (Single Source of Truth)
  const scheduledTime = formData.scheduledTime || "";
  const customHour = scheduledTime.includes(":") ? scheduledTime.split(":")[0] : "08";
  const customMinute = scheduledTime.includes(":") ? scheduledTime.split(":")[1] : "00";

  const presets = useMemo(() => {
    const today = new Date();
    
    // Tìm ngày Thứ Bảy tuần này
    const dayOfWeek = today.getDay(); // 0: CN, 1: T2, ..., 6: T7
    let daysUntilSaturday = 6 - dayOfWeek;
    if (daysUntilSaturday < 0) {
      daysUntilSaturday = 6;
    }
    const saturday = addDays(today, daysUntilSaturday);

    return [
      { label: "Hôm nay", date: today },
      { label: "Ngày mai", date: addDays(today, 1) },
      { label: "Ngày kia", date: addDays(today, 2) },
      { label: "Thứ 7 này", date: saturday }
    ];
  }, []);

  const selectedDate = formData.scheduledDate ? new Date(formData.scheduledDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      updateForm({ scheduledDate: format(date, "yyyy-MM-dd") });
      setError("");
    }
  };

  const handleTimeSelect = (time: string) => {
    updateForm({ scheduledTime: time });
    setError("");
  };

  const handleCustomHourChange = (hour: string) => {
    updateForm({ scheduledTime: `${hour}:${customMinute}` });
    setError("");
  };

  const handleCustomMinuteChange = (minute: string) => {
    updateForm({ scheduledTime: `${customHour}:${minute}` });
    setError("");
  };

  const handleNext = () => {
    if (!formData.scheduledDate) {
      setError("Vui lòng chọn ngày thực hiện");
      return;
    }
    if (!formData.scheduledTime) {
      setError("Vui lòng chọn khung giờ");
      return;
    }
    setError("");
    onNext();
  };

  // --- RENDERING CHO MOBILE ---
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight mb-1">Thời gian phục vụ</h2>
          <p className="text-muted-foreground text-xs">Chọn thời gian bạn muốn chuyên gia có mặt.</p>
        </div>

        <div className="flex-1 space-y-4">
          {/* Card Trigger Chọn ngày */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 px-1">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              Ngày thực hiện
            </label>
            <button
              type="button"
              onClick={() => setIsDateDrawerOpen(true)}
              className="w-full p-4 bg-muted/30 border border-border/50 rounded-xl shadow-sm hover:border-primary/30 transition-all flex items-center justify-between text-left active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground font-semibold">Ngày phục vụ</span>
                  <span className="block text-sm font-bold text-foreground">
                    {selectedDate 
                      ? format(selectedDate, "EEEE, 'ngày' dd/MM/yyyy", { locale: vi })
                      : "Chưa chọn ngày - Chạm để chọn"}
                  </span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-primary hover:underline">Chọn ngay</span>
            </button>
          </div>

          {/* Card Trigger Chọn giờ */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 px-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Giờ bắt đầu
            </label>
            <button
              type="button"
              onClick={() => setIsTimeDrawerOpen(true)}
              className="w-full p-4 bg-muted/30 border border-border/50 rounded-xl shadow-sm hover:border-primary/30 transition-all flex items-center justify-between text-left active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground font-semibold">Khung giờ</span>
                  <span className="block text-sm font-bold text-foreground">
                    {formData.scheduledTime 
                      ? `${formData.scheduledTime} (Chạm để đổi)` 
                      : "Chưa chọn giờ - Chạm để chọn"}
                  </span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-primary hover:underline">Chọn ngay</span>
            </button>
          </div>
        </div>

        {/* Drawer Chọn Ngày */}
        <Drawer open={isDateDrawerOpen} onOpenChange={setIsDateDrawerOpen}>
          <DrawerContent className="px-4 pb-6 rounded-t-3xl">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-lg font-extrabold text-center">Chọn ngày dịch vụ</DrawerTitle>
              <DrawerDescription className="text-center text-xs">Vui lòng chọn ngày bạn muốn thực hiện công việc</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pt-2 px-1 pb-4">
              {/* Presets */}
              <div className="flex flex-wrap gap-2 justify-center pb-3 border-b border-border/20">
                {presets.map((preset) => {
                  const dateStr = format(preset.date, "yyyy-MM-dd");
                  const isSelected = formData.scheduledDate === dateStr;
                  return (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => handleDateSelect(preset.date)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 border flex items-center gap-1
                        \${isSelected 
                          ? "bg-gradient-to-r from-primary to-amber-500 border-primary text-primary-foreground shadow-sm shadow-primary/10 scale-105" 
                          : "bg-background border-border/60 text-foreground/75 hover:border-primary/50 hover:text-primary"}
                      `}
                    >
                      <span>{preset.label}</span>
                      <span className="opacity-70 text-[10px]">({format(preset.date, "dd/MM")})</span>
                    </button>
                  );
                })}
              </div>

              {/* Lịch */}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                locale={vi}
                className="mx-auto"
              />

              {formData.scheduledDate && selectedDate && (
                <div className="text-center text-xs font-bold text-primary bg-primary/5 py-2.5 px-4 rounded-xl border border-primary/10">
                  Đã chọn: {format(selectedDate, "EEEE, 'ngày' dd 'tháng' MM, yyyy", { locale: vi })}
                </div>
              )}

              <Button
                onClick={() => setIsDateDrawerOpen(false)}
                className="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 font-bold shadow-md shadow-primary/15 text-sm"
              >
                Xác nhận ngày
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Drawer Chọn Giờ */}
        <Drawer open={isTimeDrawerOpen} onOpenChange={setIsTimeDrawerOpen}>
          <DrawerContent className="px-4 pb-6 rounded-t-3xl">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-lg font-extrabold text-center">Khung giờ phục vụ</DrawerTitle>
              <DrawerDescription className="text-center text-xs">Vui lòng chọn khung giờ trống hoặc tự chọn giờ riêng</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pt-2 px-1 pb-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 px-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Khung giờ phổ biến
                </span>
                <div className="grid grid-cols-3 gap-2 bg-muted/20 border border-border/40 rounded-xl p-3">
                  {TIME_SLOTS.map((time) => {
                    const isSelected = formData.scheduledTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        className={`h-11 rounded-lg text-xs font-bold transition-all duration-300 border flex items-center justify-center active:scale-95
                          \${isSelected 
                            ? "bg-gradient-to-br from-primary to-amber-500 border-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" 
                            : "bg-background border-border/50 text-foreground/80 hover:border-primary/40 hover:bg-primary/5"}
                        `}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tự chọn giờ cụ thể */}
              <div className="space-y-2 pt-2 border-t border-border/20">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 px-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Hoặc tự chọn giờ cụ thể
                </span>
                <div className="flex items-center gap-3 bg-muted/20 border border-border/40 p-4 rounded-xl">
                  <div className="flex-1 flex items-center gap-2">
                    <Select value={customHour} onValueChange={handleCustomHourChange}>
                      <SelectTrigger className="h-11 text-sm rounded-lg font-bold bg-background border border-border/60">
                        <SelectValue placeholder="Giờ" />
                      </SelectTrigger>
                      <SelectContent className="z-[60] bg-popover text-popover-foreground border shadow-lg rounded-lg">
                        {HOURS.map(h => <SelectItem key={h} value={h} className="font-bold cursor-pointer">{h} giờ</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="text-sm font-bold text-muted-foreground">:</span>
                    <Select value={customMinute} onValueChange={handleCustomMinuteChange}>
                      <SelectTrigger className="h-11 text-sm rounded-lg font-bold bg-background border border-border/60">
                        <SelectValue placeholder="Phút" />
                      </SelectTrigger>
                      <SelectContent className="z-[60] bg-popover text-popover-foreground border shadow-lg rounded-lg">
                        {MINUTES.map(m => <SelectItem key={m} value={m} className="font-bold cursor-pointer">{m} phút</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setIsTimeDrawerOpen(false)}
                className="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 font-bold shadow-md shadow-primary/15 text-sm mt-4"
              >
                Xác nhận giờ
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Nút điều hướng */}
        {error && (
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 mt-4 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}

        <div className="mt-8 flex justify-between gap-3">
          <Button 
            variant="outline"
            onClick={onBack}
            className="h-12 px-6 rounded-lg border-border/60 font-bold hover:bg-muted text-foreground/90 active:scale-95 transition-all w-1/3"
          >
            Quay lại
          </Button>
          <Button 
            onClick={handleNext}
            className="h-12 flex-1 rounded-lg bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 text-primary-foreground font-bold shadow-md shadow-primary/15 active:scale-95 transition-all text-sm"
          >
            Tiếp tục
          </Button>
        </div>
      </div>
    );
  }

  // --- RENDERING CHO DESKTOP & TABLET ---
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 text-center md:text-left">
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Thời gian phục vụ</h2>
        <p className="text-muted-foreground text-sm">Chọn thời gian bạn muốn chuyên gia có mặt.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Calendar Side */}
        <div className="space-y-3 md:w-1/2">
          <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            Chọn ngày
          </label>
          <div className="p-4 bg-muted/30 border border-border/50 rounded-2xl shadow-sm flex flex-col gap-4">
            {/* Presets Quick Pick - Ant Design Style */}
            <div className="flex flex-wrap gap-2 justify-center pb-3 border-b border-border/20">
              {presets.map((preset) => {
                const dateStr = format(preset.date, "yyyy-MM-dd");
                const isSelected = formData.scheduledDate === dateStr;
                return (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => handleDateSelect(preset.date)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 border flex items-center gap-1
                      \${isSelected 
                        ? "bg-gradient-to-r from-primary to-amber-500 border-primary text-primary-foreground shadow-sm shadow-primary/10 scale-105" 
                        : "bg-background border-border/60 text-foreground/75 hover:border-primary/50 hover:text-primary"}
                    `}
                  >
                    <span>{preset.label}</span>
                    <span className="opacity-70 text-[10px]">({format(preset.date, "dd/MM")})</span>
                  </button>
                );
              })}
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
              locale={vi}
              className="mx-auto"
            />

            {formData.scheduledDate && selectedDate && (
              <div className="text-center text-xs font-bold text-primary bg-primary/5 py-2.5 px-4 rounded-xl border border-primary/10 mt-1 animate-pulse">
                Đã chọn: {format(selectedDate, "EEEE, 'ngày' dd 'tháng' MM, yyyy", { locale: vi })}
              </div>
            )}
          </div>
        </div>

        {/* Time Slots Side */}
        <div className="space-y-3 md:w-1/2 flex flex-col">
          <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Khung giờ có sẵn
          </label>
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 flex-1 flex flex-col min-h-[300px]">
            {!selectedDate ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 py-10">
                <CalendarIcon className="w-14 h-14 mb-3 text-muted-foreground/60 animate-bounce" />
                <p className="text-sm font-bold text-foreground/80">Vui lòng chọn ngày</p>
                <p className="text-xs text-muted-foreground mt-1">để hiển thị các khung giờ phục vụ trống</p>
              </div>
            ) : (
              <div className="flex flex-col h-full gap-4">
                {/* Slots phổ biến */}
                <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1 pb-1 scrollbar-thin max-h-[220px]">
                  {TIME_SLOTS.map((time) => {
                    const isSelected = formData.scheduledTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        className={`h-12 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 border flex items-center justify-center active:scale-95
                          \${isSelected 
                            ? "bg-gradient-to-br from-primary to-amber-500 border-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" 
                            : "bg-background border-border/50 text-foreground/80 hover:border-primary/40 hover:bg-primary/5"}
                        `}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>

                {/* Tự chọn giờ cụ thể */}
                <div className="pt-4 border-t border-border/20 space-y-3">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Hoặc tự chọn giờ cụ thể
                  </span>
                  <div className="flex items-center gap-3 bg-background p-3.5 rounded-xl border border-border/50 shadow-sm">
                    <div className="flex-1 flex items-center gap-2">
                      <Select value={customHour} onValueChange={handleCustomHourChange}>
                        <SelectTrigger className="h-10 text-sm rounded-lg font-bold bg-muted/40 border border-border/60">
                          <SelectValue placeholder="Giờ" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground border shadow-md rounded-lg">
                          {HOURS.map(h => <SelectItem key={h} value={h} className="font-bold cursor-pointer">{h} giờ</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-sm font-bold text-muted-foreground">:</span>
                      <Select value={customMinute} onValueChange={handleCustomMinuteChange}>
                        <SelectTrigger className="h-10 text-sm rounded-lg font-bold bg-muted/40 border border-border/60">
                          <SelectValue placeholder="Phút" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground border shadow-md rounded-lg">
                          {MINUTES.map(m => <SelectItem key={m} value={m} className="font-bold cursor-pointer">{m} phút</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 mt-4 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3">
        <Button 
          variant="outline"
          onClick={onBack}
          className="h-14 w-full sm:w-auto px-6 rounded-xl border-border/60 font-bold hover:bg-muted text-foreground/90 active:scale-95 transition-all order-2 sm:order-1"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Quay lại
        </Button>
        <Button 
          onClick={handleNext}
          className="h-14 w-full sm:w-auto px-8 rounded-xl bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 text-primary-foreground font-bold shadow-lg shadow-primary/20 text-base active:scale-95 transition-all order-1 sm:order-2"
        >
          Tiếp tục
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
