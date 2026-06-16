"use client"

import * as React from "react"
import { FileText, Ban, CheckCircle, Eye, AlertTriangle, ShieldAlert, Users, CheckCircle2, UserX, MapPin, CreditCard, Wallet, Award, Activity, Search } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner" // Giả sử dự án có dùng sonner, nếu không thì console.log

export type TaskerData = {
  id: string
  fullName: string
  phone: string
  email: string
  avatarUrl?: string
  services: string[]
  joinDate: string
  docStatus: "PENDING" | "APPROVED" | "REJECTED"
  taskerStatus: "ACTIVE" | "SUSPENDED" | "TERMINATED"
  ratingAvg: number
  totalCompletedJobs: number
  cancelledJobs: number
  // Fields from Tasker Profile
  bio: string
  experience: string
  skills: string
  addressResident: string
  addressCurrent: string
  bankName: string
  bankAccountNumber: string
  bankAccountName: string
  mainBalance: number
  bPoint: number
  docs: {
    cccd: boolean
    selfie: boolean
    criminalRecord: boolean
    healthCert: boolean
    jobCert: boolean
  }
  docIdNumber: string
  docIssuedDate: string
  docExpiredDate: string
  depositAmount: number
  workingAddress: string
  totalWorkingHours: number
  level: string
}

// Sinh ra 50 bản ghi giả lập đa dạng
const mockData: TaskerData[] = Array.from({ length: 50 }).map((_, i) => {
  const isPending = i % 7 === 0;
  const isSuspended = i % 15 === 0;
  const isTerminated = i % 25 === 0;
  
  let docStatus: TaskerData["docStatus"] = "APPROVED";
  if (isPending) docStatus = "PENDING";
  else if (i % 12 === 0) docStatus = "REJECTED";

  let taskerStatus: TaskerData["taskerStatus"] = "ACTIVE";
  if (isSuspended) taskerStatus = "SUSPENDED";
  if (isTerminated) taskerStatus = "TERMINATED";

  const servicesList = ["Dọn dẹp nhà", "Nấu ăn", "Giặt ủi", "Vệ sinh máy lạnh", "Tổng vệ sinh"];
  const numServices = (i % 3) + 1;
  const services = Array.from({ length: numServices }).map((_, j) => servicesList[(i + j) % servicesList.length]);

  return {
    id: `TSK-${String(i + 1).padStart(3, '0')}`,
    fullName: `Nguyễn Văn ${String.fromCharCode(65 + (i % 26))} ${i}`,
    phone: `090${String(i).padStart(7, '0')}`,
    email: `tasker${i}@example.com`,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Tasker${i}`,
    services,
    joinDate: new Date(Date.now() - (i * 86400000 * 3)).toISOString(),
    docStatus,
    taskerStatus,
    ratingAvg: isPending ? 0 : (Math.random() * (5 - 3.5) + 3.5),
    totalCompletedJobs: isPending ? 0 : Math.floor(Math.random() * 200),
    cancelledJobs: Math.floor(Math.random() * 10),
    // Profile details
    bio: "Tôi là một người cẩn thận, tỉ mỉ và yêu thích sự sạch sẽ. Đã có kinh nghiệm làm việc nhà nhiều năm.",
    experience: "3 năm làm nhân viên vệ sinh tại khách sạn 4 sao. 2 năm dọn dẹp hộ gia đình.",
    skills: "Sử dụng thành thạo các loại hóa chất tẩy rửa công nghiệp, biết là ủi đồ đúng chuẩn.",
    addressResident: "123 Đường ABC, Phường XYZ, Quận 1, TP. HCM",
    addressCurrent: "456 Đường DEF, Phường GHI, Quận 3, TP. HCM",
    bankName: "Vietcombank",
    bankAccountNumber: "01234567890",
    bankAccountName: `NGUYEN VAN ${String.fromCharCode(65 + (i % 26))}`,
    mainBalance: Math.floor(Math.random() * 5000000),
    bPoint: Math.floor(Math.random() * 1000),
    docs: {
      cccd: true,
      selfie: true,
      criminalRecord: docStatus === "APPROVED",
      healthCert: docStatus !== "REJECTED",
      jobCert: i % 2 === 0,
    },
    docIdNumber: `079099${String(i).padStart(6, '0')}`,
    docIssuedDate: "2020-01-15",
    docExpiredDate: "2040-01-15",
    depositAmount: 400000,
    workingAddress: "Quận 1, Quận 3, Bình Thạnh",
    totalWorkingHours: isPending ? 0 : Math.floor(Math.random() * 1000),
    level: i % 3 === 0 ? "Ong Chúa" : i % 2 === 0 ? "Ong Thợ" : "Ong Non"
  }
});

function DocBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
      done
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
        : 'border-border bg-muted/50 text-muted-foreground'
    )}>
      {done
        ? <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        : <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" aria-hidden="true" />}
      {label}
    </div>
  );
}

export default function AdminTaskersPage() {
  const [data, setData] = React.useState<TaskerData[]>(mockData)
  
  // Sheet & Modal states
  const [selectedTasker, setSelectedTasker] = React.useState<TaskerData | null>(null);
  const [reviewTasker, setReviewTasker] = React.useState<TaskerData | null>(null);
  const [suspendTasker, setSuspendTasker] = React.useState<TaskerData | null>(null);
  const [banTasker, setBanTasker] = React.useState<TaskerData | null>(null);
  
  const stats = React.useMemo(() => {
    return {
      total: data.length,
      active: data.filter(d => d.taskerStatus === "ACTIVE").length,
      pendingDoc: data.filter(d => d.docStatus === "PENDING").length,
      suspended: data.filter(d => d.taskerStatus === "SUSPENDED" || d.taskerStatus === "TERMINATED").length,
    }
  }, [data]);

  const [filter, setFilter] = React.useState({
    taskerStatus: "ALL",
    docStatus: "ALL",
    keyword: "",
    page: 1,
    limit: 10
  })

  const filteredData = React.useMemo(() => {
    return data.filter(item => {
      const matchTaskerStatus = filter.taskerStatus === "ALL" || item.taskerStatus === filter.taskerStatus;
      const matchDocStatus = filter.docStatus === "ALL" || item.docStatus === filter.docStatus;
      const matchKeyword = !filter.keyword || 
        item.fullName.toLowerCase().includes(filter.keyword.toLowerCase()) || 
        item.phone.includes(filter.keyword) ||
        item.email.toLowerCase().includes(filter.keyword.toLowerCase());
        
      return matchTaskerStatus && matchDocStatus && matchKeyword;
    });
  }, [data, filter.taskerStatus, filter.docStatus, filter.keyword]);

  const displayData = filteredData.slice((filter.page - 1) * filter.limit, filter.page * filter.limit);

  // Actions Logic
  const handleUpdateStatus = (id: string, updates: Partial<TaskerData>, message: string) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    if (typeof window !== "undefined") {
      toast?.success?.(message) || alert(message);
    }
  }

  const columns: Column<TaskerData>[] = [
    {
      key: "fullName",
      title: "Đối tác",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={row.avatarUrl} />
            <AvatarFallback>{row.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.fullName}</span>
            <span className="text-xs text-muted-foreground">{row.phone} • {row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "services",
      title: "Dịch vụ",
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {row.services.map((svc, idx) => (
            <Badge key={idx} variant="secondary" className="text-[10px] whitespace-nowrap">
              {svc}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "ratingAvg",
      title: "Hiệu suất",
      render: (row) => {
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-amber-500 text-sm">★ {row.ratingAvg > 0 ? row.ratingAvg.toFixed(1) : "N/A"}</span>
              <span className="text-[10px] text-muted-foreground">({row.totalCompletedJobs} ca)</span>
            </div>
            {row.cancelledJobs > 0 && (
              <span className="text-[10px] text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Hủy {row.cancelledJobs} ca
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "docStatus",
      title: "Hồ sơ",
      render: (row) => {
        return (
          <Badge className={cn(
            "px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border-none",
            row.docStatus === "APPROVED" ? "bg-emerald-500/10 text-emerald-500" :
            row.docStatus === "PENDING" ? "bg-amber-500/10 text-amber-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {row.docStatus}
          </Badge>
        )
      },
    },
    {
      key: "taskerStatus",
      title: "Trạng thái",
      render: (row) => {
        return (
          <Badge className={cn(
            "px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border-none",
            row.taskerStatus === "ACTIVE" ? "bg-blue-500/10 text-blue-500" :
            row.taskerStatus === "SUSPENDED" ? "bg-orange-500/10 text-orange-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {row.taskerStatus === "TERMINATED" ? "BỊ KHÓA" : row.taskerStatus}
          </Badge>
        )
      },
    },
    {
      key: "joinDate",
      title: "Ngày tham gia",
      render: (row) => {
        const date = new Date(row.joinDate);
        return <span className="text-xs text-muted-foreground">{date.toLocaleDateString('vi-VN')}</span>
      }
    }
  ]

  const rowActions: RowAction<TaskerData>[] = [
    {
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setSelectedTasker(row),
      variant: "default",
    },
    {
      label: "Duyệt hồ sơ",
      icon: FileText,
      onClick: (row) => setReviewTasker(row),
      variant: "default",
      hidden: (row) => row.docStatus !== "PENDING",
    },
    {
      type: "ban",
      label: "Đình chỉ",
      icon: Ban,
      onClick: (row) => setSuspendTasker(row),
      hidden: (row) => row.taskerStatus !== "ACTIVE",
    },
    {
      label: "Mở khóa",
      icon: CheckCircle,
      onClick: (row) => handleUpdateStatus(row.id, { taskerStatus: "ACTIVE" }, "Đã mở khóa tài khoản Tasker!"),
      hidden: (row) => row.taskerStatus === "ACTIVE",
      variant: "default",
    },
    {
      type: "delete",
      label: "Khóa vĩnh viễn",
      onClick: (row) => setBanTasker(row),
      hidden: (row) => row.taskerStatus === "TERMINATED",
    }
  ]

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Đối tác (Tasker)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Xét duyệt hồ sơ, theo dõi hiệu suất và quản lý hoạt động của nhân viên.
          </p>
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Tổng Tasker</p>
            <h3 className="text-2xl font-black">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Đang hoạt động</p>
            <h3 className="text-2xl font-black">{stats.active}</h3>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Chờ duyệt hồ sơ</p>
            <h3 className="text-2xl font-black">{stats.pendingDoc}</h3>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Đình chỉ / Khóa</p>
            <h3 className="text-2xl font-black">{stats.suspended}</h3>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <BaseTableList
        columns={columns}
        data={displayData}
        rowKey="id"
        keyword={filter.keyword}
        onKeywordChange={(keyword) => setFilter(prev => ({ ...prev, keyword, page: 1 }))}
        placeholderSearch="Tìm kiếm theo tên, SĐT, Email..."
        rowActions={rowActions}
        totalItems={filteredData.length}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter(prev => ({ ...prev, page }))}
        onLimitChange={(limit) => setFilter(prev => ({ ...prev, limit, page: 1 }))}
        filters={
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Filter Trạng thái hoạt động */}
            <Select 
              value={filter.taskerStatus} 
              onValueChange={(val) => setFilter(prev => ({ ...prev, taskerStatus: val, page: 1 }))}
            >
              <SelectTrigger className="h-11 min-w-[160px] w-full sm:w-auto rounded-xl border-border/60 bg-background text-sm font-medium focus:ring-primary/20">
                <SelectValue placeholder="Trạng thái tài khoản" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả tài khoản</SelectItem>
                <SelectItem value="ACTIVE">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Đang hoạt động</div>
                </SelectItem>
                <SelectItem value="SUSPENDED">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Bị đình chỉ</div>
                </SelectItem>
                <SelectItem value="TERMINATED">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Khóa vĩnh viễn</div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Trạng thái hồ sơ */}
            <Select 
              value={filter.docStatus} 
              onValueChange={(val) => setFilter(prev => ({ ...prev, docStatus: val, page: 1 }))}
            >
              <SelectTrigger className="h-11 min-w-[160px] w-full sm:w-auto rounded-xl border-border/60 bg-background text-sm font-medium focus:ring-primary/20">
                <SelectValue placeholder="Trạng thái hồ sơ" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả hồ sơ</SelectItem>
                <SelectItem value="APPROVED">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đã duyệt</div>
                </SelectItem>
                <SelectItem value="PENDING">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Chờ duyệt</div>
                </SelectItem>
                <SelectItem value="REJECTED">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Bị từ chối</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* --- TASKER DETAIL SHEET --- */}
      <Sheet open={!!selectedTasker} onOpenChange={(o) => !o && setSelectedTasker(null)}>
        <SheetContent className="sm:max-w-xl w-[90vw] p-0 flex flex-col bg-background/95 backdrop-blur-xl">
          {selectedTasker && (
            <>
              <SheetHeader className="p-6 pb-0 space-y-0 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-border">
                      <AvatarImage src={selectedTasker.avatarUrl} />
                      <AvatarFallback>{selectedTasker.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-2xl font-bold">{selectedTasker.fullName}</SheetTitle>
                      <SheetDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {selectedTasker.id}
                        </Badge>
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase border-none">
                          {selectedTasker.level}
                        </Badge>
                        <span className="text-amber-500 font-bold flex items-center">
                          ★ {selectedTasker.ratingAvg.toFixed(1)}
                        </span>
                      </SheetDescription>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              
              <Tabs defaultValue="overview" className="flex-1 flex flex-col mt-6">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 py-0 h-10 space-x-4">
                  <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2">
                    Tổng quan
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2">
                    Liên hệ & Ngân hàng
                  </TabsTrigger>
                  <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2">
                    Giấy tờ tùy thân
                  </TabsTrigger>
                </TabsList>
                
                <ScrollArea className="flex-1 p-6">
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card border rounded-xl p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Wallet className="w-4 h-4" />
                          <span className="text-sm font-medium">Tài khoản chính</span>
                        </div>
                        <p className="text-xl font-bold text-primary">{selectedTasker.mainBalance.toLocaleString('vi-VN')} đ</p>
                      </div>
                      <div className="bg-card border rounded-xl p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Award className="w-4 h-4" />
                          <span className="text-sm font-medium">Điểm thưởng</span>
                        </div>
                        <p className="text-xl font-bold text-primary">{selectedTasker.bPoint} bPoint</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 border rounded-xl p-4">
                        <p className="text-xs text-muted-foreground mb-1">Tiền cọc (Deposit)</p>
                        <p className="text-sm font-bold text-foreground">{selectedTasker.depositAmount.toLocaleString('vi-VN')} đ</p>
                      </div>
                      <div className="bg-muted/30 border rounded-xl p-4">
                        <p className="text-xs text-muted-foreground mb-1">Tổng giờ làm việc</p>
                        <p className="text-sm font-bold text-foreground">{selectedTasker.totalWorkingHours} giờ</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Dịch vụ đăng ký</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedTasker.services.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Giới thiệu bản thân</h4>
                        <p className="text-sm text-muted-foreground">{selectedTasker.bio || "Chưa cập nhật"}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Kinh nghiệm</h4>
                        <p className="text-sm text-muted-foreground">{selectedTasker.experience || "Chưa cập nhật"}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Kỹ năng</h4>
                        <p className="text-sm text-muted-foreground">{selectedTasker.skills || "Chưa cập nhật"}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Khu vực đăng ký làm việc</h4>
                        <p className="text-sm font-medium text-primary">{selectedTasker.workingAddress || "Chưa cập nhật"}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="mt-0 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Địa chỉ</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Địa chỉ hiện tại</p>
                            <p className="text-sm font-medium">{selectedTasker.addressCurrent || "Chưa cập nhật"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Địa chỉ thường trú</p>
                            <p className="text-sm font-medium">{selectedTasker.addressResident || "Chưa cập nhật"}</p>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Thông tin ngân hàng</h4>
                        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Ngân hàng</p>
                              <p className="text-sm font-bold">{selectedTasker.bankName || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Số tài khoản</p>
                              <p className="text-sm font-bold">{selectedTasker.bankAccountNumber || "—"}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Chủ tài khoản</p>
                            <p className="text-sm font-medium">{selectedTasker.bankAccountName || "—"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="docs" className="mt-0 space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-3">Thông tin định danh</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                        <div>
                          <p className="text-xs text-muted-foreground">Số CCCD / CMND</p>
                          <p className="text-sm font-bold">{selectedTasker.docIdNumber || "—"}</p>
                        </div>
                        <div></div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ngày cấp</p>
                          <p className="text-sm font-medium">{selectedTasker.docIssuedDate ? new Date(selectedTasker.docIssuedDate).toLocaleDateString('vi-VN') : "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ngày hết hạn</p>
                          <p className="text-sm font-medium">{selectedTasker.docExpiredDate ? new Date(selectedTasker.docExpiredDate).toLocaleDateString('vi-VN') : "—"}</p>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-3">Tài liệu đã tải lên</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <DocBadge done={selectedTasker.docs.cccd} label="Ảnh CCCD (Mặt trước & sau)" />
                        <DocBadge done={selectedTasker.docs.selfie} label="Selfie cùng CCCD" />
                        <DocBadge done={selectedTasker.docs.criminalRecord} label="Lý lịch tư pháp" />
                        <DocBadge done={selectedTasker.docs.healthCert} label="Giấy khám sức khoẻ" />
                        <DocBadge done={selectedTasker.docs.jobCert} label="Chứng chỉ nghề (Nếu có)" />
                      </div>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* --- MODALS --- */}
      
      {/* Review Docs Modal */}
      <AlertDialog open={!!reviewTasker} onOpenChange={(o) => !o && setReviewTasker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duyệt hồ sơ Tasker</AlertDialogTitle>
            <AlertDialogDescription>
              Kiểm tra các giấy tờ tùy thân của <strong>{reviewTasker?.fullName}</strong> trước khi cấp quyền nhận việc trên hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reviewTasker && (
            <div className="grid grid-cols-1 gap-2 my-4">
              <DocBadge done={reviewTasker.docs.cccd} label="Ảnh CCCD" />
              <DocBadge done={reviewTasker.docs.selfie} label="Selfie cùng CCCD" />
              <DocBadge done={reviewTasker.docs.criminalRecord} label="Lý lịch tư pháp" />
              <DocBadge done={reviewTasker.docs.healthCert} label="Giấy khám sức khoẻ" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if(reviewTasker) handleUpdateStatus(reviewTasker.id, { docStatus: "APPROVED" }, "Đã duyệt hồ sơ Tasker thành công!");
                setReviewTasker(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Phê duyệt hồ sơ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Modal */}
      <AlertDialog open={!!suspendTasker} onOpenChange={(o) => !o && setSuspendTasker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đình chỉ hoạt động</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang thực hiện đình chỉ tài khoản của <strong>{suspendTasker?.fullName}</strong>. Vui lòng ghi rõ lý do.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2 space-y-2">
            <Label>Lý do đình chỉ</Label>
            <Textarea placeholder="VD: Bị khách hàng phàn nàn nhiều lần..." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if(suspendTasker) handleUpdateStatus(suspendTasker.id, { taskerStatus: "SUSPENDED" }, "Đã đình chỉ tài khoản Tasker.");
                setSuspendTasker(null);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Xác nhận đình chỉ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Modal */}
      <AlertDialog open={!!banTasker} onOpenChange={(o) => !o && setBanTasker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Khóa vĩnh viễn tài khoản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn khóa vĩnh viễn <strong>{banTasker?.fullName}</strong> khỏi hệ thống? Hành động này sẽ từ chối mọi quyền truy cập và rút tiền.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy thao tác</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if(banTasker) handleUpdateStatus(banTasker.id, { taskerStatus: "TERMINATED" }, "Đã khóa vĩnh viễn tài khoản.");
                setBanTasker(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Khóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
