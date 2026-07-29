"use client";

import React from "react";
import { Calendar, MapPin, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { useAdminTaskerSchedule } from "../hooks/admin-tasker.hooks";
import type { TaskerScheduleItem, TaskerCoverageItem } from "../types/admin-tasker.types";

const DAYS_OF_WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const SHIFTS = [
  { id: "MORNING", label: "Sáng (07:00 - 12:00)" },
  { id: "AFTERNOON", label: "Chiều (13:00 - 17:00)" },
  { id: "EVENING", label: "Tối (17:00 - 21:00)" },
];

// Helper để map mảng data trả về (cấu trúc DB thực tế) vào bảng ma trận
const mapScheduleData = (schedules: TaskerScheduleItem[]) => {
  const result: Record<string, Record<string, boolean>> = {};
  DAYS_OF_WEEK.forEach(day => {
    result[day] = { MORNING: false, AFTERNOON: false, EVENING: false };
  });

  schedules.forEach(schedule => {
    // Map dayOfWeek DB (2 -> T2, 3 -> T3... 1/8 -> CN)
    let dayStr = "T" + schedule.dayOfWeek;
    if (schedule.dayOfWeek === 1 || schedule.dayOfWeek === 8) dayStr = "CN";
    if (result[dayStr]) {
      result[dayStr][schedule.shift] = schedule.isAvailable;
    }
  });

  return result;
};

export const TaskerScheduleTab: React.FC<{ taskerId: string }> = ({ taskerId }) => {
  const { data: scheduleResponse, isLoading } = useAdminTaskerSchedule(taskerId);
  const data = scheduleResponse?.data || { schedules: [], coverages: [] };
  const scheduleMatrix = mapScheduleData(data.schedules);
  
  // Lấy danh sách tên quận
  const coverages = data.coverages?.length > 0 
    ? data.coverages.map((c: TaskerCoverageItem) => c.districtName || c.districtCode)
    : ["Chưa đăng ký khu vực"];

  if (isLoading) return <div className="p-8 text-center text-[var(--c-muted)]">Đang tải lịch trình...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        
        {/* Lịch làm việc */}
        <AdminCard className="overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[var(--c-line)] bg-[var(--c-card)]">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--c-primary-strong)]" />
              <h3 className="text-sm font-bold text-[var(--c-ink)]">Lịch đăng ký tuần này</h3>
            </div>
            <span className="text-xs text-[var(--c-muted)] flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0E9F6E]" /> Sẵn sàng nhận việc
            </span>
          </div>
          
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[500px]">
              <thead>
                <tr>
                  <th className="border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-left font-semibold text-[var(--c-muted)]">Ca làm</th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day} className="border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-center font-bold text-[var(--c-ink)]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFTS.map(shift => (
                  <tr key={shift.id}>
                    <td className="border border-[var(--c-line)] p-3 font-medium text-[var(--c-ink)] whitespace-nowrap">
                      {shift.label}
                    </td>
                    {DAYS_OF_WEEK.map(day => {
                      const isFree = scheduleMatrix[day]?.[shift.id] ?? false;
                      return (
                        <td key={`${day}-${shift.id}`} className="border border-[var(--c-line)] p-2 text-center transition-colors">
                          <div className={`w-full h-10 rounded-lg flex items-center justify-center ${isFree ? 'bg-[#0E9F6E]/10 border border-[#0E9F6E]/20 text-[#0E9F6E]' : 'bg-[var(--c-card-2)] text-[var(--c-muted)]/30'}`}>
                            {isFree ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        {/* Khu vực & Giới hạn */}
        <div className="space-y-6">
          <AdminCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-[var(--c-primary-strong)]" />
              <h3 className="text-sm font-bold text-[var(--c-ink)]">Khu vực hoạt động</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {coverages.map((area: string, index: number) => (
                <Badge key={`${area}-${index}`} variant="outline" className="bg-[var(--c-card-2)] text-[var(--c-ink)] border-[var(--c-line-strong)] font-medium px-3 py-1.5">
                  {area}
                </Badge>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="p-5 bg-[rgba(225,29,72,0.03)] border border-[rgba(225,29,72,0.1)]">
             <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-[#E11D48]" />
              <h3 className="text-sm font-bold text-[#E11D48]">Cảnh báo Lịch trình</h3>
            </div>
            <p className="text-xs text-[var(--c-ink-soft)] leading-relaxed mb-3">
              Tasker này có tỷ lệ hủy ca cao (trên 10%) trong tuần qua. Hãy theo dõi chặt chẽ để tránh ảnh hưởng đến khách hàng.
            </p>
          </AdminCard>
        </div>

      </div>
    </div>
  );
};
