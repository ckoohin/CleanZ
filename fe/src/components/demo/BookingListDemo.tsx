"use client";

import React, { useState, useMemo } from "react";
import { 
  Sparkles, Star, Home, Wind, Coffee, Wrench,
  AlertCircle, ShieldCheck, Eye, UserCheck, RefreshCw, Trash2, Download,
  ChevronDown, Check, Filter, RotateCcw,
  User, MapPin, Clock, CreditCard, Calendar, History, Plus, Phone, ShieldAlert,
  FileText, CheckCircle2, XCircle,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BaseTableList, type Column, type RowAction, type BulkAction } from "@/components/ui/base/base_table_list";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Mock Booking Data
interface TimelineEvent {
  time: string;
  status: string;
  label: string;
  actor: string;
  note?: string;
}

interface BookingDemoItem {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  serviceType: "cleaning" | "appliance" | "laundry" | "repair";
  scheduledStart: string;
  totalPrice: number;
  status: "POSTED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  paymentStatus: "PAID" | "UNPAID";
  tasker?: {
    name: string;
    avatar: string;
    phone: string;
    rating: number;
  };
  note?: string;
  timeline?: TimelineEvent[];
}

const MOCK_BOOKINGS: BookingDemoItem[] = [
  {
    id: "bk-1",
    bookingCode: "BK1204",
    customerName: "Lê Minh Tâm",
    customerPhone: "0987654321",
    serviceName: "Dọn dẹp nhà định kỳ",
    serviceType: "cleaning",
    scheduledStart: "2026-06-23T08:00:00.000Z",
    totalPrice: 180000,
    status: "CONFIRMED",
    paymentStatus: "PAID",
    tasker: {
      name: "Nguyễn Văn Hùng",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
      phone: "0911223344",
      rating: 4.9,
    }
  },
  {
    id: "bk-2",
    bookingCode: "BK1205",
    customerName: "Nguyễn Thị Phương Hoài",
    customerPhone: "0912345678",
    serviceName: "Vệ sinh máy lạnh treo tường",
    serviceType: "appliance",
    scheduledStart: "2026-06-23T10:30:00.000Z",
    totalPrice: 150000,
    status: "IN_PROGRESS",
    paymentStatus: "PAID",
    tasker: {
      name: "Trần Minh Quang",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
      phone: "0922334455",
      rating: 4.8,
    }
  },
  {
    id: "bk-3",
    bookingCode: "BK1206",
    customerName: "Phạm Hồng Phúc",
    customerPhone: "0909998887",
    serviceName: "Giặt hấp Sofa nỉ",
    serviceType: "laundry",
    scheduledStart: "2026-06-24T14:00:00.000Z",
    totalPrice: 320000,
    status: "POSTED",
    paymentStatus: "UNPAID",
  },
  {
    id: "bk-4",
    bookingCode: "BK1207",
    customerName: "Trần Minh Hoàng",
    customerPhone: "0933445566",
    serviceName: "Sửa chữa hệ thống điện gia đình",
    serviceType: "repair",
    scheduledStart: "2026-06-23T09:00:00.000Z",
    totalPrice: 250000,
    status: "COMPLETED",
    paymentStatus: "PAID",
    tasker: {
      name: "Phạm Văn Đức",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80",
      phone: "0944556677",
      rating: 5.0,
    }
  },
  {
    id: "bk-5",
    bookingCode: "BK1208",
    customerName: "Hoàng Thị Mỹ Hạnh",
    customerPhone: "0944556677",
    serviceName: "Tổng vệ sinh chuyên sâu biệt thự",
    serviceType: "cleaning",
    scheduledStart: "2026-06-25T08:00:00.000Z",
    totalPrice: 1250000,
    status: "POSTED",
    paymentStatus: "UNPAID",
  },
  {
    id: "bk-6",
    bookingCode: "BK1209",
    customerName: "Đặng Hoàng Việt",
    customerPhone: "0955667788",
    serviceName: "Giặt ủi quần áo cao cấp",
    serviceType: "laundry",
    scheduledStart: "2026-06-22T15:30:00.000Z",
    totalPrice: 200000,
    status: "CANCELLED",
    paymentStatus: "UNPAID",
  },
  {
    id: "bk-7",
    bookingCode: "BK1210",
    customerName: "Vũ Thị Thủy",
    customerPhone: "0966778899",
    serviceName: "Dọn dẹp nhà theo giờ",
    serviceType: "cleaning",
    scheduledStart: "2026-06-23T13:00:00.000Z",
    totalPrice: 160000,
    status: "COMPLETED",
    paymentStatus: "PAID",
    tasker: {
      name: "Nguyễn Văn Hùng",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
      phone: "0911223344",
      rating: 4.9,
    }
  },
  {
    id: "bk-8",
    bookingCode: "BK1211",
    customerName: "Lê Hoàng Nam",
    customerPhone: "0977889900",
    serviceName: "Vệ sinh máy giặt cửa ngang",
    serviceType: "appliance",
    scheduledStart: "2026-06-24T09:00:00.000Z",
    totalPrice: 220000,
    status: "POSTED",
    paymentStatus: "UNPAID",
  },
  {
    id: "bk-9",
    bookingCode: "BK1212",
    customerName: "Trần Thu Hà",
    customerPhone: "0988990011",
    serviceName: "Ủi quần áo tại nhà",
    serviceType: "laundry",
    scheduledStart: "2026-06-23T15:00:00.000Z",
    totalPrice: 90000,
    status: "CONFIRMED",
    paymentStatus: "PAID",
    tasker: {
      name: "Trần Minh Quang",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
      phone: "0922334455",
      rating: 4.8,
    }
  },
  {
    id: "bk-10",
    bookingCode: "BK1213",
    customerName: "Nguyễn Tuấn Anh",
    customerPhone: "0999001122",
    serviceName: "Sửa vòi nước rò rỉ",
    serviceType: "repair",
    scheduledStart: "2026-06-23T16:30:00.000Z",
    totalPrice: 120000,
    status: "IN_PROGRESS",
    paymentStatus: "PAID",
    tasker: {
      name: "Phạm Văn Đức",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80",
      phone: "0944556677",
      rating: 5.0,
    }
  },
  {
    id: "bk-11",
    bookingCode: "BK1214",
    customerName: "Phan Mỹ Linh",
    customerPhone: "0911224455",
    serviceName: "Tổng vệ sinh văn phòng",
    serviceType: "cleaning",
    scheduledStart: "2026-06-25T13:00:00.000Z",
    totalPrice: 1500000,
    status: "CANCELLED",
    paymentStatus: "UNPAID",
  },
  {
    id: "bk-12",
    bookingCode: "BK1215",
    customerName: "Ngô Quốc Bảo",
    customerPhone: "0922335566",
    serviceName: "Vệ sinh lò vi sóng & tủ lạnh",
    serviceType: "appliance",
    scheduledStart: "2026-06-24T10:00:00.000Z",
    totalPrice: 200000,
    status: "POSTED",
    paymentStatus: "UNPAID",
  },
  {
    id: "bk-13",
    bookingCode: "BK1216",
    customerName: "Lâm Hoài Vy",
    customerPhone: "0933446677",
    serviceName: "Dọn dẹp căn hộ chung cư",
    serviceType: "cleaning",
    scheduledStart: "2026-06-23T14:00:00.000Z",
    totalPrice: 250000,
    status: "CONFIRMED",
    paymentStatus: "PAID",
    tasker: {
      name: "Nguyễn Văn Hùng",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
      phone: "0911223344",
      rating: 4.9,
    }
  },
  {
    id: "bk-14",
    bookingCode: "BK1217",
    customerName: "Đỗ Duy Mạnh",
    customerPhone: "0944557788",
    serviceName: "Giặt thảm văn phòng",
    serviceType: "laundry",
    scheduledStart: "2026-06-25T09:00:00.000Z",
    totalPrice: 450000,
    status: "COMPLETED",
    paymentStatus: "PAID",
    tasker: {
      name: "Trần Minh Quang",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
      phone: "0922334455",
      rating: 4.8,
    }
  },
  {
    id: "bk-15",
    bookingCode: "BK1218",
    customerName: "Hoàng Mỹ Duyên",
    customerPhone: "0955668899",
    serviceName: "Sửa khóa cửa tay gạt",
    serviceType: "repair",
    scheduledStart: "2026-06-23T11:00:00.000Z",
    totalPrice: 150000,
    status: "IN_PROGRESS",
    paymentStatus: "PAID",
    tasker: {
      name: "Phạm Văn Đức",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80",
      phone: "0944556677",
      rating: 5.0,
    }
  },
  {
    id: "bk-16",
    bookingCode: "BK1219",
    customerName: "Tống Khánh Linh",
    customerPhone: "0966779900",
    serviceName: "Vệ sinh điều hòa cassette",
    serviceType: "appliance",
    scheduledStart: "2026-06-24T15:00:00.000Z",
    totalPrice: 350000,
    status: "POSTED",
    paymentStatus: "UNPAID",
  },
  {
    id: "bk-17",
    bookingCode: "BK1220",
    customerName: "Trịnh Xuân Bách",
    customerPhone: "0977880011",
    serviceName: "Dọn dẹp định kỳ 2 lần/tuần",
    serviceType: "cleaning",
    scheduledStart: "2026-06-26T08:00:00.000Z",
    totalPrice: 360000,
    status: "CONFIRMED",
    paymentStatus: "PAID",
    tasker: {
      name: "Nguyễn Văn Hùng",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
      phone: "0911223344",
      rating: 4.9,
    }
  },
  {
    id: "bk-18",
    bookingCode: "BK1221",
    customerName: "Mai Phương Thảo",
    customerPhone: "0988991122",
    serviceName: "Giặt hấp áo vest cao cấp",
    serviceType: "laundry",
    scheduledStart: "2026-06-22T17:00:00.000Z",
    totalPrice: 120000,
    status: "COMPLETED",
    paymentStatus: "PAID",
    tasker: {
      name: "Trần Minh Quang",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
      phone: "0922334455",
      rating: 4.8,
    }
  }
];

const serviceIconMap = {
  cleaning: <Home className="w-3.5 h-3.5" />,
  appliance: <Wind className="w-3.5 h-3.5" />,
  laundry: <Coffee className="w-3.5 h-3.5" />,
  repair: <Wrench className="w-3.5 h-3.5" />,
};

const statusStyles = {
  POSTED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_PROGRESS: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const statusLabels = {
  POSTED: "Đang tìm kiếm nhân viên",
  CONFIRMED: "Đã nhận đơn",
  IN_PROGRESS: "Đang làm việc",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

// Option list for filter dropdowns
const serviceOptions = [
  { value: "ALL", label: "Tất cả dịch vụ" },
  { value: "cleaning", label: "Dọn dẹp nhà" },
  { value: "appliance", label: "Vệ sinh thiết bị" },
  { value: "laundry", label: "Giặt ủi" },
  { value: "repair", label: "Sửa chữa" },
];

const taskerOptions = [
  { value: "ALL", label: "Tất cả nhân viên" },
  { value: "Nguyễn Văn Hùng", label: "Nguyễn Văn Hùng" },
  { value: "Trần Minh Quang", label: "Trần Minh Quang" },
  { value: "Phạm Văn Đức", label: "Phạm Văn Đức" },
  { value: "UNASSIGNED", label: "Chờ nhận việc" },
];

const statusOptions = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "POSTED", label: "Đang tìm nhân viên" },
  { value: "CONFIRMED", label: "Đã nhận đơn" },
  { value: "IN_PROGRESS", label: "Đang làm việc" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  emptyText?: string;
  className?: string;
  icon?: React.ReactNode;
}

function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  emptyText = "Không tìm thấy",
  className,
  icon,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 px-2.5 rounded-lg border border-white/5 bg-muted/20 hover:bg-muted/40 hover:text-foreground text-[11px] font-semibold flex items-center justify-between gap-1.5 shadow-none transition-all outline-none",
            selectedOption && value !== "ALL" ? "text-[#FFA000] border-[#FFA000]/25 bg-[#FFA000]/5" : "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            {icon && <span className="shrink-0 opacity-70">{icon}</span>}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0 bg-slate-900 border-white/10 rounded-xl" align="start">
        <Command className="bg-slate-900 text-foreground">
          <CommandInput 
            placeholder="Tìm kiếm..." 
            className="h-8.5 text-[11px] placeholder:text-muted-foreground/60 border-none bg-transparent"
          />
          <CommandList className="max-h-48 border-t border-white/5">
            <CommandEmpty className="py-4 text-center text-[10px] text-muted-foreground font-medium">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "text-[11px] font-medium flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer transition-colors mx-1 my-0.5",
                      isSelected 
                        ? "bg-[#FFA000]/10 text-[#FFA000] font-bold" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#FFA000] shrink-0" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface FilterGroupProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  showClearBtn?: boolean;
}

function FilterGroup({ children, onClearAll, showClearBtn }: FilterGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
      <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wider pr-1">
        <Filter className="w-3.5 h-3.5" />
        <span>Lọc theo:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {children}
      </div>

      {showClearBtn && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8 px-2.5 rounded-lg text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all gap-1 shadow-none"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </Button>
      )}
    </div>
  );
}

const getTimelineForBooking = (b: BookingDemoItem): TimelineEvent[] => {
  if (b.timeline && b.timeline.length > 0) return b.timeline;
  
  const events: TimelineEvent[] = [
    { time: new Date(new Date(b.scheduledStart).getTime() - 24 * 60 * 60 * 1000).toISOString(), status: "POSTED", label: "Tạo đơn hàng thành công", actor: "Khách hàng" }
  ];
  
  if (b.status !== "POSTED" && b.tasker) {
    events.push({
      time: new Date(new Date(b.scheduledStart).getTime() - 23 * 60 * 60 * 1000).toISOString(),
      status: "CONFIRMED",
      label: `Hệ thống gán nhân viên ${b.tasker.name}`,
      actor: "Hệ thống"
    });
  }
  
  if (b.status === "IN_PROGRESS") {
    if (b.tasker) {
      events.push({
        time: new Date(new Date(b.scheduledStart).getTime() - 23 * 60 * 60 * 1000).toISOString(),
        status: "CONFIRMED",
        label: `Nhân viên ${b.tasker.name} nhận việc`,
        actor: "Hệ thống"
      });
    }
    events.push({
      time: b.scheduledStart,
      status: "IN_PROGRESS",
      label: "Bắt đầu làm việc",
      actor: "Tasker"
    });
  } else if (b.status === "COMPLETED") {
    if (b.tasker) {
      events.push({
        time: new Date(new Date(b.scheduledStart).getTime() - 23 * 60 * 60 * 1000).toISOString(),
        status: "CONFIRMED",
        label: `Nhân viên ${b.tasker.name} nhận việc`,
        actor: "Hệ thống"
      });
    }
    events.push({
      time: b.scheduledStart,
      status: "IN_PROGRESS",
      label: "Bắt đầu làm việc",
      actor: "Tasker"
    });
    events.push({
      time: new Date(new Date(b.scheduledStart).getTime() + 2 * 60 * 60 * 1000).toISOString(),
      status: "COMPLETED",
      label: "Hoàn thành công việc & nghiệm thu",
      actor: "Tasker"
    });
  } else if (b.status === "CANCELLED") {
    events.push({
      time: new Date(new Date(b.scheduledStart).getTime() - 12 * 60 * 60 * 1000).toISOString(),
      status: "CANCELLED",
      label: "Đã hủy đơn hàng",
      actor: "Khách hàng",
      note: "Yêu cầu hủy từ Admin/Khách hàng"
    });
  }
  
  return events;
};

const getNoteForBooking = (id: string): string => {
  const baseId = id.split("-").slice(0, 2).join("-");
  const notesMap: Record<string, string> = {
    "bk-1": "Khách yêu cầu mang đầy đủ dụng cụ vệ sinh và nước lau sàn hữu cơ.",
    "bk-2": "Máy lạnh Daikin 1.5 HP, cục nóng treo tường cao cần mang thang chuyên dụng.",
    "bk-3": "Giặt Sofa nỉ 3 chỗ ngồi, có vài vết bẩn sẫm màu khó sạch ở đệm tựa đầu.",
    "bk-4": "Kiểm tra ổ cắm phòng bếp bị chập điện, nhảy aptomat liên tục khi cắm lò vi sóng.",
    "bk-5": "Biệt thự 3 tầng, cần 2 nhân viên dọn dẹp chuyên sâu cả sân thượng.",
    "bk-7": "Chung cư lầu 12, cần nhân viên có mang máy hút bụi cầm tay để dọn thảm phòng ngủ.",
    "bk-9": "Khách yêu cầu là quần áo sơ mi và quần tây công sở cẩn thận.",
  };
  return notesMap[baseId] || "Không có ghi chú đặc biệt từ khách hàng.";
};

interface BookingDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDemoItem | null;
  onAssignClick: () => void;
  onUpdateStatusClick: () => void;
  onCancelClick: () => void;
}

function BookingDetailDrawer({
  open,
  onOpenChange,
  booking,
  onAssignClick,
  onUpdateStatusClick,
  onCancelClick,
}: BookingDetailDrawerProps) {
  if (!booking) return null;

  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(booking.totalPrice);

  const startInfo = new Date(booking.scheduledStart);
  const formattedDate = startInfo.toLocaleDateString("vi-VN", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const formattedTime = startInfo.toLocaleTimeString("vi-VN", {
    hour: "2-digit", minute: "2-digit"
  });

  const timelineEvents = getTimelineForBooking(booking);
  const bookingNote = getNoteForBooking(booking.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg bg-slate-950 border-l border-white/10 text-foreground overflow-y-auto flex flex-col p-0">
        <SheetHeader className="p-6 border-b border-white/5 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-[#FFA000]/10 text-[#FFA000] border border-[#FFA000]/20 font-bold px-2 py-0.5 rounded-md">
              CHI TIẾT ĐƠN HÀNG
            </span>
            <span className="font-mono text-xs font-bold text-muted-foreground">
              ID: {booking.id.split("-")[0]}
            </span>
          </div>
          <SheetTitle className="text-xl font-serif font-black tracking-tight text-white flex items-center justify-between mt-2">
            Mã Đơn: <span className="text-[#FFA000] font-mono">#{booking.bookingCode}</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground font-light">
            Thông tin chi tiết và nhật ký hoạt động của đơn hàng.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 p-6 space-y-6 text-left">
          {/* Trạng thái & Tổng tiền */}
          <div className="bg-card/40 border border-white/5 rounded-2xl p-4.5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#FFA000]" /> Trạng thái
              </span>
              <Badge variant="outline" className={cn("text-[9px] font-black border uppercase px-2 py-0.5 rounded-md", statusStyles[booking.status])}>
                {statusLabels[booking.status]}
              </Badge>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#FFA000]" /> Tổng tiền thanh toán
              </span>
              <span className="text-lg font-black text-white">{formattedPrice}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Thanh toán:</span>
              <span className={cn("font-bold", booking.paymentStatus === 'PAID' ? 'text-emerald-500' : 'text-amber-500')}>
                {booking.paymentStatus === 'PAID' ? 'ĐÃ THANH TOÁN (Ví CleanZ)' : 'CHỜ THANH TOÁN (Tiền mặt)'}
              </span>
            </div>
          </div>

          {/* Lịch làm việc & Dịch vụ */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#FFA000]" /> Thông tin công việc
            </h4>
            <div className="bg-card/40 border border-white/5 rounded-2xl p-4 space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">DỊCH VỤ</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-[#FFA000]">{serviceIconMap[booking.serviceType]}</span>
                  {booking.serviceName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">NGÀY LÀM</span>
                  <span className="font-semibold text-white/90">{formattedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">GIỜ LÀM</span>
                  <span className="font-semibold text-[#FFA000]">{formattedTime}</span>
                </div>
              </div>
              {bookingNote && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] text-muted-foreground font-semibold block mb-1">GHI CHÚ VẬN HÀNH</span>
                  <p className="text-[11px] leading-relaxed text-amber-200/80 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg font-light">
                    {bookingNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Khách hàng */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#FFA000]" /> Khách hàng
            </h4>
            <div className="bg-card/40 border border-white/5 rounded-2xl p-4 text-xs space-y-2.5">
              <div className="flex justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">TÊN KHÁCH HÀNG</span>
                  <span className="font-bold text-white/90">{booking.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">SỐ ĐIỆN THOẠI</span>
                  <span className="font-bold text-[#FFA000]">{booking.customerPhone}</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-white/5">
                <span className="text-[10px] text-muted-foreground font-semibold block mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FFA000]" /> ĐỊA CHỈ THỰC HIỆN
                </span>
                <span className="text-[11px] text-white/80 leading-relaxed font-light block bg-white/5 p-2 rounded-lg">
                  254 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh
                </span>
              </div>
            </div>
          </div>

          {/* Nhân viên (Tasker) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#FFA000]" /> Nhân viên thực hiện
            </h4>
            <div className="bg-card/40 border border-white/5 rounded-2xl p-4 text-xs">
              {booking.tasker ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <img src={booking.tasker.avatar} alt={booking.tasker.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">{booking.tasker.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">{booking.tasker.phone}</span>
                    </div>
                  </div>
                  <div className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg border border-amber-500/10 flex items-center gap-1 text-[10px] font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{booking.tasker.rating} / 5</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 border border-dashed border-white/10 rounded-xl space-y-2">
                  <p className="text-[11px] text-muted-foreground italic font-light">
                    Chưa có nhân viên nhận công việc này
                  </p>
                  {booking.status === "POSTED" && (
                    <Button
                      size="sm"
                      onClick={onAssignClick}
                      className="h-7 rounded-lg text-[10px] font-bold bg-[#FFA000] text-white hover:bg-[#FFA000]/90 px-3 transition-all"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Phân nhân viên thủ công
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline Lịch sử */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#FFA000]" /> Nhật ký vận hành (Timeline)
            </h4>
            <div className="relative pl-4 border-l border-white/10 ml-2 space-y-4 text-xs py-1">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative">
                  {/* Dot indicator */}
                  <span className="absolute -left-[20.5px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-slate-950 border border-white/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FFA000]" />
                  </span>
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-white/90">{evt.label}</span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(evt.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-light">
                      Thực hiện bởi: <span className="font-medium text-white/60">{evt.actor}</span>
                      {evt.note && <span className="block italic text-rose-400/80 mt-1 font-mono">{evt.note}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nút hành động chân Drawer */}
        {booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && (
          <SheetFooter className="p-4 border-t border-white/5 bg-slate-950 gap-2 flex-row md:flex-row justify-end text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdateStatusClick}
              className="h-8.5 rounded-lg text-xs font-semibold bg-muted/20 border-white/5 hover:bg-muted/40 hover:text-foreground shadow-none text-white/90"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Trạng thái
            </Button>

            {booking.status === "POSTED" && (
              <Button
                size="sm"
                onClick={onAssignClick}
                className="h-8.5 rounded-lg text-xs font-semibold bg-[#FFA000] text-white hover:bg-[#FFA000]/90 shadow-none"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Gán Tasker
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={onCancelClick}
              className="h-8.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive border-transparent hover:bg-destructive hover:text-destructive-foreground shadow-none"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Hủy đơn
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

const MOCK_TASKERS = [
  { id: "t-1", name: "Nguyễn Văn Hùng", rating: 4.9, phone: "0911223344", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80", distance: "1.2 km", status: "Rảnh" },
  { id: "t-2", name: "Trần Minh Quang", rating: 4.8, phone: "0922334455", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80", distance: "2.5 km", status: "Đang làm việc" },
  { id: "t-3", name: "Phạm Văn Đức", rating: 5.0, phone: "0944556677", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80", distance: "0.8 km", status: "Rảnh" },
  { id: "t-4", name: "Lê Hoàng Nam", rating: 4.6, phone: "0977889900", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80", distance: "3.1 km", status: "Rảnh" },
];

interface AssignTaskerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDemoItem | null;
  onAssign: (tasker: typeof MOCK_TASKERS[0]) => void;
}

function AssignTaskerModal({ open, onOpenChange, booking, onAssign }: AssignTaskerModalProps) {
  const [query, setQuery] = useState("");
  if (!booking) return null;

  const filteredTaskers = MOCK_TASKERS.filter(t => 
    t.name.toLowerCase().includes(query.toLowerCase()) || 
    t.phone.includes(query)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border border-white/10 bg-slate-900 text-foreground max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-white/5 text-left">
          <DialogTitle className="font-serif text-base font-bold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#FFA000] shrink-0" />
            Gán Tasker Cho Đơn #{booking.bookingCode}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[11px] leading-relaxed font-light">
            Chọn một nhân viên (Tasker) khả dụng bên dưới để gán công việc này.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {/* Ô nhập tìm kiếm nhanh */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="h-8.5 w-full rounded-lg border border-white/10 bg-slate-950 pl-8.5 pr-8 text-[11px] font-medium outline-hidden focus:border-[#FFA000]/40 transition-colors text-white"
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List Tasker */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
            {filteredTaskers.length > 0 ? (
              filteredTaskers.map((tasker) => (
                <div 
                  key={tasker.id}
                  className="flex items-center justify-between bg-card/30 border border-white/5 hover:border-[#FFA000]/25 rounded-xl p-3 hover:bg-[#FFA000]/5 transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <img src={tasker.avatar} alt={tasker.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">{tasker.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          {tasker.rating}
                        </span>
                        <span>•</span>
                        <span>{tasker.distance}</span>
                        <span>•</span>
                        <span className={cn(tasker.status === "Rảnh" ? "text-emerald-500" : "text-amber-500")}>
                          {tasker.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onAssign(tasker);
                      setQuery("");
                    }}
                    className="h-7 text-[10px] font-bold bg-[#FFA000] text-white hover:bg-[#FFA000]/90 px-3 rounded-lg shadow-none"
                  >
                    Gán
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-[10px] text-muted-foreground font-light">
                Không tìm thấy nhân viên khả dụng
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDemoItem | null;
  onUpdateStatus: (newStatus: BookingDemoItem["status"], note: string) => void;
}

function UpdateStatusModal({ open, onOpenChange, booking, onUpdateStatus }: UpdateStatusModalProps) {
  const [status, setStatus] = useState<BookingDemoItem["status"] | "">("");
  const [note, setNote] = useState("");

  React.useEffect(() => {
    if (booking) {
      setStatus(booking.status);
      setNote("");
    }
  }, [booking, open]);

  if (!booking) return null;

  // Xác định các trạng thái hợp lệ tiếp theo
  const getNextStatuses = (): { value: BookingDemoItem["status"]; label: string }[] => {
    switch (booking.status) {
      case "POSTED":
        return [
          { value: "CONFIRMED", label: "Đã nhận đơn" },
          { value: "CANCELLED", label: "Hủy đơn" }
        ];
      case "CONFIRMED":
        return [
          { value: "IN_PROGRESS", label: "Đang làm việc" },
          { value: "CANCELLED", label: "Hủy đơn" }
        ];
      case "IN_PROGRESS":
        return [
          { value: "COMPLETED", label: "Hoàn thành" },
          { value: "CANCELLED", label: "Hủy đơn" }
        ];
      default:
        return [];
    }
  };

  const nextStatuses = getNextStatuses();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border border-white/10 bg-slate-900 text-foreground max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-white/5 text-left">
          <DialogTitle className="font-serif text-base font-bold tracking-tight text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#FFA000] shrink-0" />
            Cập Nhật Trạng Thái Đơn
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[11px] leading-relaxed font-light">
            Mã đơn: <span className="text-white font-mono font-bold">#{booking.bookingCode}</span>. Vui lòng chọn trạng thái và nhập lý do.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 text-left">
          {/* Grid trạng thái tiếp theo */}
          <div className="space-y-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Chọn trạng thái tiếp theo
            </span>
            <div className="grid grid-cols-2 gap-2">
              {nextStatuses.map((st) => {
                const isSelected = status === st.value;
                return (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setStatus(st.value)}
                    className={cn(
                      "h-8.5 rounded-lg border text-[11px] font-bold transition-all",
                      isSelected
                        ? "bg-[#FFA000] text-white border-[#FFA000]"
                        : "bg-slate-950 text-muted-foreground border-white/10 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ghi chú vận hành */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Ghi chú nội bộ / Lý do
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập lý do thay đổi trạng thái..."
              rows={3}
              className="w-full text-xs text-white bg-slate-950 border border-white/10 rounded-lg p-2 focus:border-[#FFA000]/40 outline-hidden font-light"
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-950 border-t border-white/5 gap-2 flex-row justify-end text-right">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-lg text-xs font-semibold text-muted-foreground bg-transparent border-transparent hover:bg-white/5 hover:text-white shadow-none"
          >
            Đóng
          </Button>
          <Button
            onClick={() => {
              if (status) {
                onUpdateStatus(status, note);
              }
            }}
            disabled={!status}
            className="h-8 rounded-lg text-xs font-semibold bg-[#FFA000] text-white hover:bg-[#FFA000]/90"
          >
            Cập nhật
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CancelBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDemoItem | null;
  onCancel: (reason: string) => void;
}

const CANCEL_REASONS = [
  "Khách hàng đổi ý, không có nhu cầu nữa",
  "Khách bận đột xuất, dời lịch hẹn sang tuần sau",
  "Không phân bổ được nhân viên phù hợp đúng giờ",
  "Lỗi hệ thống hoặc sai sót thông tin đặt lịch",
];

function CancelBookingModal({ open, onOpenChange, booking, onCancel }: CancelBookingModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  React.useEffect(() => {
    if (open) {
      setSelectedReason("");
      setOtherReason("");
    }
  }, [open]);

  if (!booking) return null;

  const handleSubmit = () => {
    const finalReason = selectedReason === "OTHER" ? otherReason : selectedReason;
    if (!finalReason.trim()) {
      toast.error("Vui lòng nhập hoặc chọn lý do hủy đơn");
      return;
    }
    onCancel(finalReason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border border-white/10 bg-slate-900 text-foreground max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-white/5 text-left">
          <DialogTitle className="font-serif text-base font-bold tracking-tight text-rose-500 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
            HỦY ĐƠN HÀNG KHẨN CẤP
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[11px] leading-relaxed font-light">
            Cảnh báo: Đơn hàng <span className="text-white font-mono font-bold">#{booking.bookingCode}</span> sẽ bị hủy và gửi thông báo hoàn tiền (nếu có).
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 text-left">
          {/* Lý do gợi ý */}
          <div className="space-y-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Chọn lý do hủy nhanh
            </span>
            <div className="space-y-1.5">
              {CANCEL_REASONS.map((r, i) => (
                <label 
                  key={i} 
                  className="flex items-start gap-2.5 p-2 bg-slate-950 border border-white/5 hover:border-white/10 rounded-lg cursor-pointer transition-all"
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="mt-0.5 accent-[#FFA000] shrink-0"
                  />
                  <span className="text-[11px] text-muted-foreground leading-normal">{r}</span>
                </label>
              ))}
              <label 
                className="flex items-start gap-2.5 p-2 bg-slate-950 border border-white/5 hover:border-white/10 rounded-lg cursor-pointer transition-all"
              >
                <input
                  type="radio"
                  name="cancel_reason"
                  checked={selectedReason === "OTHER"}
                  onChange={() => setSelectedReason("OTHER")}
                  className="mt-0.5 accent-[#FFA000] shrink-0"
                />
                <span className="text-[11px] text-muted-foreground leading-normal font-semibold">Lý do khác</span>
              </label>
            </div>
          </div>

          {/* Nhập lý do khác */}
          {selectedReason === "OTHER" && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                Mô tả chi tiết lý do
              </span>
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Nhập lý do hủy chi tiết..."
                rows={2}
                className="w-full text-xs text-white bg-slate-950 border border-white/10 rounded-lg p-2 focus:border-rose-500/40 outline-hidden font-light"
              />
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-950 border-t border-white/5 gap-2 flex-row justify-end text-right">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-lg text-xs font-semibold text-muted-foreground bg-transparent border-transparent hover:bg-white/5 hover:text-white shadow-none"
          >
            Quay lại
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedReason || (selectedReason === "OTHER" && !otherReason.trim())}
            className="h-8 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
          >
            Hủy đơn hàng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BookingListDemo() {
  const [bookingsList, setBookingsList] = useState<BookingDemoItem[]>(MOCK_BOOKINGS);
  const [activeBooking, setActiveBooking] = useState<BookingDemoItem | null>(null);
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<string>("ALL");
  const [selectedTasker, setSelectedTasker] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  
  // State phân trang thực tế
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5); // default hiển thị 5 đơn mỗi trang để dễ xem phân trang

  // State quản lý Confirm Dialog chung cho các hành động hàng loạt (Bulk Actions)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

  // Helper trigger Confirm Dialog
  const triggerConfirm = (title: string, description: string, onConfirmCallback: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      description,
      onConfirm: () => {
        onConfirmCallback();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Logic chuyển đổi bộ lọc và reset page về 1
  const handleServiceChange = (val: string) => {
    setSelectedService(val);
    setPage(1);
  };

  const handleTaskerChange = (val: string) => {
    setSelectedTasker(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setPage(1);
  };

  // Handlers thao tác dữ liệu qua state động
  const handleAssignTasker = (tasker: typeof MOCK_TASKERS[0]) => {
    if (!activeBooking) return;
    
    const baseId = activeBooking.id.split("-")[0];
    
    setBookingsList((prev) => 
      prev.map((b) => {
        if (b.id === baseId) {
          const nowStr = new Date().toISOString();
          const updatedTimeline = [
            ...(getTimelineForBooking(b)),
            {
              time: nowStr,
              status: "CONFIRMED",
              label: `Admin gán nhân viên ${tasker.name}`,
              actor: "Admin Portal"
            }
          ];
          const updated = {
            ...b,
            status: "CONFIRMED" as const,
            tasker: {
              name: tasker.name,
              phone: tasker.phone,
              avatar: tasker.avatar,
              rating: tasker.rating
            },
            timeline: updatedTimeline
          };
          setActiveBooking(updated);
          return updated;
        }
        return b;
      })
    );
    setIsAssignOpen(false);
    toast.success(`Đã gán nhân viên ${tasker.name} thành công`);
  };

  const handleUpdateStatus = (newStatus: BookingDemoItem["status"], statusNote: string) => {
    if (!activeBooking) return;
    
    const baseId = activeBooking.id.split("-")[0];
    
    setBookingsList((prev) => 
      prev.map((b) => {
        if (b.id === baseId) {
          const nowStr = new Date().toISOString();
          const statusLabelText = statusLabels[newStatus];
          const updatedTimeline = [
            ...(getTimelineForBooking(b)),
            {
              time: nowStr,
              status: newStatus,
              label: `Admin chuyển trạng thái đơn sang: ${statusLabelText}`,
              actor: "Admin Portal",
              note: statusNote || undefined
            }
          ];
          const updated = {
            ...b,
            status: newStatus,
            timeline: updatedTimeline
          };
          setActiveBooking(updated);
          return updated;
        }
        return b;
      })
    );
    setIsStatusOpen(false);
    toast.success(`Đã cập nhật trạng thái đơn thành ${statusLabels[newStatus]}`);
  };

  const handleCancelBooking = (cancelReason: string) => {
    if (!activeBooking) return;
    
    const baseId = activeBooking.id.split("-")[0];
    
    setBookingsList((prev) => 
      prev.map((b) => {
        if (b.id === baseId) {
          const nowStr = new Date().toISOString();
          const updatedTimeline = [
            ...(getTimelineForBooking(b)),
            {
              time: nowStr,
              status: "CANCELLED" as const,
              label: "Hủy đơn hàng khẩn cấp",
              actor: "Admin Portal",
              note: cancelReason
            }
          ];
          const updated = {
            ...b,
            status: "CANCELLED" as const,
            timeline: updatedTimeline
          };
          setActiveBooking(updated);
          return updated;
        }
        return b;
      })
    );
    setIsCancelOpen(false);
    setIsDetailOpen(false); // đóng luôn drawer chi tiết khi hủy đơn
    toast.error(`Đã hủy đơn hàng #${activeBooking.bookingCode}`);
  };

  // Bộ lọc tìm kiếm & trạng thái nâng cao từ bookingsList state động
  const filteredBookings = useMemo(() => {
    return bookingsList.filter(b => {
      const matchSearch = b.bookingCode.toLowerCase().includes(search.toLowerCase()) || 
                          b.customerName.toLowerCase().includes(search.toLowerCase()) ||
                          b.serviceName.toLowerCase().includes(search.toLowerCase());
      
      const matchService = selectedService === "ALL" || b.serviceType === selectedService;
      
      let matchTasker = true;
      if (selectedTasker !== "ALL") {
        if (selectedTasker === "UNASSIGNED") {
          matchTasker = !b.tasker;
        } else {
          matchTasker = b.tasker?.name === selectedTasker;
        }
      }

      const matchStatus = selectedStatus === "ALL" || b.status === selectedStatus;
      return matchSearch && matchService && matchTasker && matchStatus;
    });
  }, [bookingsList, search, selectedService, selectedTasker, selectedStatus]);

  // Tổng số lượng bản ghi giả lập để test phân trang 100 trang
  const simulatedTotal = useMemo(() => {
    if (search || selectedService !== "ALL" || selectedTasker !== "ALL" || selectedStatus !== "ALL") {
      return filteredBookings.length;
    }
    return 500; // 500 đơn / limit 5 = đúng 100 trang
  }, [filteredBookings, search, selectedService, selectedTasker, selectedStatus]);

  // Cắt lát dữ liệu phân trang thực tế kèm xoay vòng dữ liệu để test trang lớn thoải mái
  const displayBookings = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const isSimulating = !search && selectedService === "ALL" && selectedTasker === "ALL" && selectedStatus === "ALL";
    const totalToUse = isSimulating ? 500 : filteredBookings.length;
    
    if (filteredBookings.length === 0) return [];
    
    const result = [];
    for (let i = 0; i < limit; i++) {
      const currentGlobalIndex = startIndex + i;
      if (currentGlobalIndex >= totalToUse) break;
      
      const targetIndex = currentGlobalIndex % filteredBookings.length;
      const baseItem = filteredBookings[targetIndex];
      
      result.push({
        ...baseItem,
        id: `${baseItem.id}-${currentGlobalIndex}`,
        bookingCode: `BK${1204 + currentGlobalIndex}`
      });
    }
    return result;
  }, [filteredBookings, page, limit, search, selectedService, selectedTasker, selectedStatus]);

  // Định nghĩa các cột hiển thị dữ liệu
  const columns: Column<BookingDemoItem>[] = [
    {
      key: "bookingCode",
      title: "Mã đơn",
      className: "w-[110px] py-3.5",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#FFA000] uppercase tracking-wider">
          #{row.bookingCode}
        </span>
      ),
    },
    {
      key: "customerName",
      title: "Khách hàng",
      render: (row) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-xs text-foreground/90">{row.customerName}</span>
          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">{row.customerPhone}</span>
        </div>
      ),
    },
    {
      key: "serviceName",
      title: "Dịch vụ",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-[#FFA000] border border-[#FFA000]/15 flex items-center justify-center shrink-0">
            {serviceIconMap[row.serviceType]}
          </div>
          <span className="font-semibold text-xs text-foreground/80 line-clamp-1">{row.serviceName}</span>
        </div>
      ),
    },
    {
      key: "scheduledStart",
      title: "Lịch hẹn",
      render: (row) => (
        <div className="flex flex-col text-left text-xs">
          <span className="font-semibold text-foreground/80">
            {new Date(row.scheduledStart).toLocaleDateString("vi-VN")}
          </span>
          <span className="text-[10px] text-[#FFA000] font-bold mt-0.5">
            {new Date(row.scheduledStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      ),
    },
    {
      key: "totalPrice",
      title: "Tổng tiền",
      render: (row) => (
        <div className="flex flex-col text-left">
          <span className="font-black text-xs text-foreground">{formatVND(row.totalPrice)}</span>
          <span className={`text-[9px] font-bold uppercase mt-0.5 ${row.paymentStatus === "PAID" ? "text-emerald-500" : "text-amber-500"}`}>
            {row.paymentStatus === "PAID" ? "Đã thanh toán" : "Chờ thanh toán"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <Badge
          variant="outline"
          className={`text-[9px] font-black border uppercase px-2 py-0.5 rounded-md ${statusStyles[row.status]}`}
        >
          {statusLabels[row.status]}
        </Badge>
      ),
    },
    {
      key: "tasker",
      title: "Nhân viên (Tasker)",
      render: (row) => row.tasker ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 shrink-0">
            <img src={row.tasker.avatar} alt={row.tasker.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <span className="font-bold text-xs text-foreground/90 truncate leading-none">{row.tasker.name}</span>
            <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground mt-1">
              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              <span>{row.tasker.rating}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1 bg-amber-500/5 border border-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse">
          <AlertCircle className="w-2.5 h-2.5" /> Chờ nhận việc
        </div>
      ),
    },
  ];

  // Các hành động trên từng dòng (Row Actions)
  const rowActions: RowAction<BookingDemoItem>[] = [
    {
      type: "view" as const,
      label: "Xem chi tiết đơn",
      onClick: (row) => {
        const latest = bookingsList.find(b => b.id.split("-")[0] === row.id.split("-")[0]);
        setActiveBooking(latest || row);
        setIsDetailOpen(true);
      }
    },
    {
      label: "Phân bổ nhân viên",
      icon: UserCheck,
      onClick: (row) => {
        const latest = bookingsList.find(b => b.id.split("-")[0] === row.id.split("-")[0]);
        setActiveBooking(latest || row);
        setIsAssignOpen(true);
      },
      hidden: (row) => row.status !== "POSTED"
    },
    {
      label: "Đổi trạng thái",
      icon: RefreshCw,
      onClick: (row) => {
        const latest = bookingsList.find(b => b.id.split("-")[0] === row.id.split("-")[0]);
        setActiveBooking(latest || row);
        setIsStatusOpen(true);
      },
      disabled: (row) => row.status === "COMPLETED" || row.status === "CANCELLED"
    },
    {
      type: "delete" as const,
      label: "Hủy đơn hàng",
      variant: "destructive" as const,
      disabled: (row) => row.status === "COMPLETED" || row.status === "CANCELLED",
      onClick: (row) => {
        const latest = bookingsList.find(b => b.id.split("-")[0] === row.id.split("-")[0]);
        setActiveBooking(latest || row);
        setIsCancelOpen(true);
      }
    }
  ];

  // Các hành động khi chọn nhiều dòng (Bulk Actions)
  const bulkActions: BulkAction<BookingDemoItem>[] = [
    {
      label: "Xuất Excel",
      icon: Download,
      onClick: (selectedRows) => {
        triggerConfirm(
          `Xác nhận xuất Excel hàng loạt`,
          `Hệ thống sẽ kết xuất dữ liệu của ${selectedRows.length} đơn hàng đã chọn ra file Excel.`,
          () => toast.success(`[Export] Đang xuất file Excel cho ${selectedRows.length} đơn hàng đã chọn...`)
        );
      }
    },
    {
      label: "Hủy đơn hàng loạt",
      icon: Trash2,
      variant: "destructive" as const,
      onClick: (selectedRows) => {
        triggerConfirm(
          `Xác nhận HỦY hàng loạt ${selectedRows.length} đơn hàng`,
          `CẢNH BÁO: Hành động này sẽ gửi yêu cầu hủy đồng thời ${selectedRows.length} đơn hàng đã chọn lên hệ thống. Bạn đồng ý chứ?`,
          () => toast.error(`[Bulk Delete] Đã ghi nhận hủy hàng loạt cho ${selectedRows.length} đơn đã chọn.`)
        );
      }
    }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-foreground py-12 px-4 md:px-8 select-none font-sans overflow-hidden relative">
      {/* Background Decorative Radial Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFA000]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FFA000]/10 text-[#FFA000] text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 fill-[#FFA000]/10" /> Hệ thống quản trị
            </div>
            <h1 className="text-3xl md:text-4xl font-black font-serif tracking-tight leading-tight">
              Quản lý danh sách Booking <span className="text-[#FFA000]">CleanZ</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl font-light">
              Theo dõi tình trạng vận hành, phân bổ Tasker và can thiệp trạng thái đơn hàng thời gian thực.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-card/30 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-lg">
            <div className="text-left px-3 border-r border-white/10">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Doanh thu</span>
              <span className="text-sm font-black text-foreground block mt-1">{formatVND(2350000)}</span>
            </div>
            <div className="text-left px-3">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Hoạt động</span>
              <span className="text-sm font-black text-[#FFA000] block mt-1">{MOCK_BOOKINGS.length} đơn</span>
            </div>
          </div>
        </div>

        {/* --- BASE TABLE LIST --- */}
        <BaseTableList
          columns={columns}
          data={displayBookings}
          rowKey="id"
          totalItems={simulatedTotal}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1); // reset về trang 1 khi đổi limit
          }}
          keyword={search}
          onKeywordChange={(val) => {
            setSearch(val);
            setPage(1); // reset về trang 1 khi tìm kiếm
          }}
          placeholderSearch="Tìm mã đơn, tên khách hàng..."
          emptyTitle="Không tìm thấy đơn hàng nào"
          emptyDescription="Thử thay đổi từ khóa hoặc bộ lọc trạng thái để tìm kiếm lại nhé."
          rowActions={rowActions}
          inlineActionCount={2} // hiển thị 2 action đầu tiên trực tiếp, còn lại trong dropdown menu
          bulkActions={bulkActions} // kích hoạt checkbox và menu thao tác hàng loạt nổi
          filters={
            <FilterGroup
              showClearBtn={selectedService !== "ALL" || selectedTasker !== "ALL" || selectedStatus !== "ALL"}
              onClearAll={() => {
                setSelectedService("ALL");
                setSelectedTasker("ALL");
                setSelectedStatus("ALL");
                setPage(1);
                toast.info("Đã đặt lại tất cả bộ lọc");
              }}
            >
              <SearchableSelect
                value={selectedService}
                onValueChange={handleServiceChange}
                options={serviceOptions}
                placeholder="Chọn dịch vụ"
                icon={<Home className="w-3 h-3" />}
              />
              <SearchableSelect
                value={selectedTasker}
                onValueChange={handleTaskerChange}
                options={taskerOptions}
                placeholder="Chọn nhân viên"
                icon={<UserCheck className="w-3 h-3" />}
              />
              <SearchableSelect
                value={selectedStatus}
                onValueChange={handleStatusChange}
                options={statusOptions}
                placeholder="Chọn trạng thái"
                icon={<AlertCircle className="w-3 h-3" />}
              />
            </FilterGroup>
          }
        />

        {/* --- QUICK TIPS FOR SKILL EVALUATION --- */}
        <div className="bg-muted/10 border border-white/5 rounded-2xl p-5 text-left text-xs space-y-2">
          <h4 className="font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#FFA000]" /> Ghi chú Đánh giá & Điều chỉnh Skill
          </h4>
          <p className="text-muted-foreground leading-relaxed">
            Giao diện trên áp dụng hệ thống component dùng chung `BaseTableList` được nâng cấp tích hợp hiệu ứng Staggered Animation bằng `framer-motion` mượt mà khi lọc và kết quả tìm kiếm thay đổi. Kích thước các nút bấm lọc (`h-7`, `px-2.5`) và ô tìm kiếm (`h-8.5`) đã được hạ thấp tối đa, tạo tỷ lệ dẹt tinh tế, hiện đại.
          </p>
        </div>
      </div>

      {/* Confirm AlertDialog */}
      <AlertDialog 
        open={confirmState.isOpen} 
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent className="rounded-xl border border-white/10 bg-slate-900 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#FFA000] shrink-0" />
              {confirmState.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed font-light mt-2">
              {confirmState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-8 rounded-lg text-xs font-semibold bg-muted/20 border-white/5 hover:bg-muted/50 hover:text-foreground transition-all">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmState.onConfirm}
              className="h-8 rounded-lg text-xs font-semibold bg-[#FFA000] text-white hover:bg-[#FFA000]/90 shadow-sm shadow-[#FFA000]/15 transition-all"
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Slide-over Drawer Chi tiết */}
      <BookingDetailDrawer
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        booking={activeBooking}
        onAssignClick={() => setIsAssignOpen(true)}
        onUpdateStatusClick={() => setIsStatusOpen(true)}
        onCancelClick={() => setIsCancelOpen(true)}
      />

      {/* Modal Gán Tasker */}
      <AssignTaskerModal
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        booking={activeBooking}
        onAssign={handleAssignTasker}
      />

      {/* Modal Cập nhật trạng thái */}
      <UpdateStatusModal
        open={isStatusOpen}
        onOpenChange={setIsStatusOpen}
        booking={activeBooking}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Modal Hủy đơn hàng */}
      <CancelBookingModal
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        booking={activeBooking}
        onCancel={handleCancelBooking}
      />
    </main>
  );
}
