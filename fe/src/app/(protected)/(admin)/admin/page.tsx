"use client"
import TopLoadingBar from "@/components/loadings/TopLoadingBar";
import { DashboardClient } from "@/features/admin/components/DashboardClient";
import dynamic from "next/dynamic";

// const DashboardClient = dynamic(() => import('@/features/admin/components/DashboardClient'), {
//     ssr: false,
//     loading: () => (
//         <div className="flex items-center justify-center h-screen">
//             <TopLoadingBar />
//         </div>
//     )
// })
// import React from "react"
// import { motion } from "motion/react"
// import { 
//   Users, 
//   ShoppingBag, 
//   Sparkles, 
//   CalendarCheck, 
//   TrendingUp, 
//   ArrowUpRight,
//   MoreVertical,
//   Activity,
//   DollarSign
// } from "lucide-react"

// import { PremiumStatsCard } from "@/components/demo/PremiumStatsCard"
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// import { BaseButton } from "@/components/ui/base/base_button"
// import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
// import { Badge } from "@/components/ui/badge"
// import { 
//   AreaChart, 
//   Area, 
//   XAxis, 
//   YAxis, 
//   CartesianGrid, 
//   Tooltip, 
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell
// } from "recharts"
// import { cn } from "@/lib/utils"

// const DATA_REVENUE = [
//   { name: "Th 2", revenue: 4000, bookings: 240 },
//   { name: "Th 3", revenue: 3000, bookings: 139 },
//   { name: "Th 4", revenue: 2000, bookings: 980 },
//   { name: "Th 5", revenue: 2780, bookings: 390 },
//   { name: "Th 6", revenue: 1890, bookings: 480 },
//   { name: "Th 7", revenue: 2390, bookings: 380 },
//   { name: "CN", revenue: 3490, bookings: 430 },
// ]

// const DATA_CATEGORIES = [
//   { name: "Dọn dẹp", value: 400, color: "#FFA000" },
//   { name: "Vệ sinh máy lạnh", value: 300, color: "#0D47A1" },
//   { name: "Tổng vệ sinh", value: 200, color: "#10B981" },
//   { name: "Khác", value: 100, color: "#6366F1" },
// ]

// type BookingSummary = {
//   id: string
//   customer: string
//   service: string
//   amount: string
//   status: string
//   time: string
// }

// const RECENT_BOOKINGS: BookingSummary[] = [
//   { id: "#BK1204", customer: "Lê Minh Tâm", service: "Dọn nhà chuyên sâu", amount: "450.000đ", status: "Sắp tới", time: "10:30 AM" },
//   { id: "#BK1205", customer: "Nguyễn Hoàng", service: "Sửa điều hòa", amount: "200.000đ", status: "Hoàn thành", time: "09:15 AM" },
//   { id: "#BK1206", customer: "Trần Mỹ", service: "Yoga tại nhà", amount: "300.000đ", status: "Đang chờ", time: "11:00 AM" },
// ]

export default function AdminDashboardPage() {
  return <DashboardClient />;
}

// export default function AdminDashboard() {
//   const columns: Column<BookingSummary>[] = [
//     {
//       key: "id",
//       title: "Mã đơn",
//       render: (row) => <span className="font-bold text-primary">{row.id}</span>
//     },
//     {
//       key: "customer",
//       title: "Khách hàng",
//       render: (row) => <span className="font-medium">{row.customer}</span>
//     },
//     {
//       key: "service",
//       title: "Dịch vụ",
//       render: (row) => <span className="text-muted-foreground">{row.service}</span>
//     },
//     {
//       key: "amount",
//       title: "Số tiền",
//       render: (row) => <span className="font-bold">{row.amount}</span>
//     },
//     {
//       key: "status",
//       title: "Trạng thái",
//       render: (row) => (
//         <Badge className={cn(
//           "px-3 py-1 rounded-full font-bold text-[10px] uppercase border-none",
//           row.status === "Hoàn thành" ? "bg-emerald-500/10 text-emerald-500" :
//           row.status === "Sắp tới" ? "bg-amber-500/10 text-amber-500" :
//           "bg-indigo-500/10 text-indigo-500"
//         )}>
//           {row.status}
//         </Badge>
//       )
//     }
//   ]

//   const rowActions: RowAction<BookingSummary>[] = [
//     {
//       type: "view",
//       label: "Xem chi tiết",
//       onClick: (row) => console.log("View", row.id)
//     }
//   ]

//   return (
//     <div className="space-y-10 pb-20 animate-in fade-in duration-700">
//       {/* 1. Header & Welcome */}
//       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
//         <div className="space-y-2">
//           <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
//             Quản trị viên
//           </Badge>
//           <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
//             Chào buổi sáng, <span className="italic text-primary">Admin</span>
//           </h1>
//           <p className="text-muted-foreground font-light text-lg">Hệ thống đang hoạt động ổn định. Bạn có 3 thông báo mới.</p>
//         </div>
//         <div className="flex items-center gap-3">
//            <BaseButton variant="primary" className="rounded-2xl h-14 shadow-xl shadow-primary/20 px-8 font-black uppercase text-xs tracking-widest gap-2">
//               <Sparkles className="w-4 h-4" /> Báo cáo tổng hợp
//            </BaseButton>
//         </div>
//       </div>

//       {/* 2. Key Metrics - Sử dụng PremiumStatsCard */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <PremiumStatsCard
//           title="Tổng doanh thu"
//           value="1.248"
//           subValue="M VNĐ"
//           icon={DollarSign}
//           trend="+12.5%"
//           className="bg-primary/5 border-primary/20"
//         />
//         <PremiumStatsCard
//           title="Đơn hàng"
//           value="156"
//           subValue="Đơn"
//           icon={ShoppingBag}
//           trend="+8%"
//           className="bg-emerald-500/5 border-emerald-500/10"
//           iconClassName="bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500"
//         />
//         <PremiumStatsCard
//           title="Khách hàng mới"
//           value="45"
//           subValue="User"
//           icon={Users}
//           trend="+5%"
//           className="bg-blue-500/5 border-blue-500/10"
//           iconClassName="bg-blue-500/10 text-blue-600 group-hover:bg-blue-500"
//         />
//         <PremiumStatsCard
//           title="Dịch vụ hoạt động"
//           value="12"
//           subValue="Active"
//           icon={Activity}
//           className="bg-indigo-500/5 border-indigo-500/10"
//           iconClassName="bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500"
//         />
//       </div>

//       {/* 3. Charts Section */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         {/* Revenue Graph */}
//         <Card className="lg:col-span-2 border-border/40 bg-card/40 backdrop-blur-sm rounded-[2.5rem] p-4 shadow-2xl shadow-primary/5">
//           <CardHeader className="p-6 md:p-8">
//             <div className="flex items-center justify-between">
//                <div className="space-y-1">
//                  <CardTitle className="text-xl font-bold text-foreground">Xu hướng doanh thu</CardTitle>
//                  <CardDescription>Thống kê 7 ngày gần nhất</CardDescription>
//                </div>
//                <div className="flex bg-muted/50 p-1 rounded-xl">
//                   <BaseButton variant="ghost" size="sm" className="rounded-lg text-[10px] font-black uppercase bg-background shadow-sm">Tuần</BaseButton>
//                   <BaseButton variant="ghost" size="sm" className="rounded-lg text-[10px] font-black uppercase text-muted-foreground">Tháng</BaseButton>
//                </div>
//             </div>
//           </CardHeader>
//           <CardContent className="h-[350px] md:h-[400px] p-6 pt-0">
//             <ResponsiveContainer width="100%" height="100%">
//               <AreaChart data={DATA_REVENUE}>
//                 <defs>
//                   <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="5%" stopColor="#FFA000" stopOpacity={0.3}/>
//                     <stop offset="95%" stopColor="#FFA000" stopOpacity={0}/>
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
//                 <XAxis 
//                   dataKey="name" 
//                   axisLine={false} 
//                   tickLine={false} 
//                   tick={{ fontSize: 12, fontWeight: 500 }}
//                   dy={10}
//                 />
//                 <YAxis 
//                    axisLine={false} 
//                    tickLine={false} 
//                    tick={{ fontSize: 12, fontWeight: 500 }}
//                 />
//                 <Tooltip 
//                   contentStyle={{ 
//                     borderRadius: "1rem", 
//                     border: "none", 
//                     boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" 
//                   }} 
//                 />
//                 <Area 
//                   type="monotone" 
//                   dataKey="revenue" 
//                   stroke="#FFA000" 
//                   strokeWidth={3}
//                   fillOpacity={1} 
//                   fill="url(#colorRevenue)" 
//                 />
//               </AreaChart>
//             </ResponsiveContainer>
//           </CardContent>
//         </Card>

//         {/* Categories Distribution */}
//         <Card className="border-border/40 bg-card/40 backdrop-blur-sm rounded-[2.5rem] p-4 shadow-2xl shadow-primary/5">
//            <CardHeader className="p-6 md:p-8">
//               <CardTitle className="text-xl font-bold text-foreground">Phân bổ hạng mục</CardTitle>
//               <CardDescription>Theo số lượng đơn hàng</CardDescription>
//            </CardHeader>
//            <CardContent className="flex flex-col items-center">
//               <div className="h-[250px] w-full">
//                 <ResponsiveContainer width="100%" height="100%">
//                    <PieChart>
//                       <Pie
//                         data={DATA_CATEGORIES}
//                         innerRadius={60}
//                         outerRadius={80}
//                         paddingAngle={10}
//                         dataKey="value"
//                         cornerRadius={10}
//                       >
//                         {DATA_CATEGORIES.map((entry, index) => (
//                            <Cell key={`cell-${index}`} fill={entry.color} />
//                         ))}
//                       </Pie>
//                       <Tooltip />
//                    </PieChart>
//                 </ResponsiveContainer>
//               </div>
//               <div className="w-full space-y-3 mt-6">
//                 {DATA_CATEGORIES.map((item) => (
//                    <div key={item.name} className="flex items-center justify-between text-sm">
//                       <div className="flex items-center gap-2">
//                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
//                          <span className="font-medium">{item.name}</span>
//                       </div>
//                       <span className="font-bold">{item.value}%</span>
//                    </div>
//                 ))}
//               </div>
//            </CardContent>
//         </Card>
//       </div>

//       {/* 4. Recent Bookings Table */}
//       <Card className="border-border/40 bg-card/40 backdrop-blur-sm rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/5 border-none">
//         <CardHeader className="p-8 border-b border-border/10 bg-card rounded-t-[2.5rem]">
//            <div className="flex items-center justify-between">
//               <div>
//                 <CardTitle className="text-xl font-bold text-foreground">Đơn hàng gần đây</CardTitle>
//                 <CardDescription>Thông tin đơn hàng mới nhất trên hệ thống</CardDescription>
//               </div>
//               <BaseButton variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-widest bg-transparent border-primary/20 hover:bg-primary/5 hover:text-primary">Xem tất cả</BaseButton>
//            </div>
//         </CardHeader>
//         <CardContent className="p-0 bg-card">
//           <BaseTableList 
//             columns={columns} 
//             data={RECENT_BOOKINGS} 
//             rowKey="id"
//             rowActions={rowActions}
//             className="rounded-b-[2.5rem] border-none shadow-none"
//           />
//         </CardContent>
//       </Card>
//     </div>
//   )
// }
