"use client";

import { motion } from "framer-motion";
import { slideInVariants, staggerContainerVariants, staggerItemFadeUpVariants } from "@/constants/motion";
import { Plus, ArrowDownToLine, ArrowUpRight, History, CreditCard, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const mockTransactions = [
  { id: "tx-1", type: "PAYMENT", amount: -210000, date: "17/06/2026 15:30", desc: "Thanh toán dọn dẹp nhà cửa #BKG-88921" },
  { id: "tx-2", type: "DEPOSIT", amount: 500000, date: "16/06/2026 09:15", desc: "Nạp tiền từ VNPay" },
  { id: "tx-3", type: "REFUND", amount: 150000, date: "10/06/2026 11:20", desc: "Hoàn tiền hủy đơn #BKG-88102" },
];

export const WalletDashboard = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header & Card */}
      <div className="bg-primary px-4 pt-12 pb-24 rounded-b-[40px] relative">
        <h1 className="text-xl font-bold text-white mb-8 text-center">Ví CleanZ</h1>
        
        {/* Virtual Card */}
        <motion.div 
          variants={slideInVariants} 
          initial="hidden" 
          animate="visible"
          className="absolute left-4 right-4 top-28 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-900/20 text-white overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-card/5 rounded-full blur-2xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-muted-foreground/80 font-medium text-sm">Số dư khả dụng</span>
              <CreditCard className="w-6 h-6 text-muted-foreground/300" />
            </div>
            <h2 className="text-3xl font-bold mb-8">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(1240000)}
            </h2>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider mb-1">Chủ thẻ</p>
                <p className="font-semibold tracking-wide">NGUYEN VAN A</p>
              </div>
              <p className="font-mono text-muted-foreground/300">**** 8888</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Spacer for overlapping card */}
      <div className="h-32"></div>

      {/* Quick Actions */}
      <div className="px-4 mb-8">
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex justify-around">
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground/90">Nạp tiền</span>
          </button>
          
          <button className="flex flex-col items-center gap-2 group opacity-50 cursor-not-allowed">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground/90">Rút tiền</span>
          </button>
          
          <button className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 bg-orange-50 text-primary rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <History className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground/90">Lịch sử</span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground text-lg">Giao dịch gần đây</h3>
          <button className="text-sm font-bold text-primary flex items-center">Xem tất cả <ChevronRight className="w-4 h-4" /></button>
        </div>

        <motion.div variants={staggerContainerVariants} initial="hidden" animate="visible" className="space-y-3">
          {mockTransactions.map((tx) => (
            <motion.div key={tx.id} variants={staggerItemFadeUpVariants} className="bg-card p-4 rounded-2xl shadow-sm border border-border/50 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                tx.type === "PAYMENT" ? "bg-red-50 text-red-500" :
                tx.type === "DEPOSIT" ? "bg-green-50 text-green-500" : "bg-blue-50 text-blue-500"
              }`}>
                {tx.type === "PAYMENT" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownToLine className="w-5 h-5" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate text-sm">{tx.desc}</p>
                <p className="text-xs text-muted-foreground/80 mt-1">{tx.date}</p>
              </div>
              
              <div className={`font-bold shrink-0 ${tx.amount > 0 ? "text-green-600" : "text-foreground"}`}>
                {tx.amount > 0 ? "+" : ""}
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
