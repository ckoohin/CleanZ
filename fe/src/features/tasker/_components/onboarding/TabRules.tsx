"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, CheckCircle2, AlertCircle, ChevronRight, Shield, Clock, Star, DollarSign, FileText, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const RULES_SECTIONS = [
  {
    id: "commitment",
    icon: Shield,
    title: "Cam kết chất lượng",
    color: "text-primary",
    bg: "bg-primary/10",
    rules: [
      "Thực hiện công việc đúng thời gian đã hẹn với khách hàng",
      "Đảm bảo chất lượng vệ sinh đạt chuẩn theo quy trình của CleanZ",
      "Mang đầy đủ thiết bị, dụng cụ cần thiết khi đến làm việc",
      "Ăn mặc gọn gàng, lịch sự khi tiếp xúc với khách hàng",
    ]
  },
  {
    id: "conduct",
    icon: Star,
    title: "Quy tắc ứng xử",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    rules: [
      "Tuyệt đối không xâm phạm tài sản hoặc sự riêng tư của khách hàng",
      "Không yêu cầu thanh toán thêm ngoài giá đã thỏa thuận",
      "Báo cáo ngay cho CleanZ nếu phát sinh tình huống bất thường",
      "Không nhận việc riêng ngoài nền tảng với khách hàng của CleanZ",
    ]
  },
  {
    id: "income",
    icon: DollarSign,
    title: "Chính sách thu nhập",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    rules: [
      "Thu nhập được thanh toán mỗi tuần vào thứ 6 hàng tuần",
      "Chiết khấu nền tảng: 15-20% tùy mức độ hoàn thành và đánh giá",
      "Thưởng hiệu quả: Thêm 5-15% nếu đạt điểm đánh giá ≥ 4.5/5",
      "Không có phí ẩn. Mọi khoản thu/chi được công khai minh bạch",
    ]
  },
  {
    id: "cancel",
    icon: Clock,
    title: "Chính sách hủy & Phạt",
    color: "text-red-500",
    bg: "bg-red-500/10",
    rules: [
      "Hủy đơn trước 2 giờ: Phạt 50% giá trị đơn hàng",
      "Hủy đơn trong vòng 2 giờ hoặc vắng mặt: Phạt 100% + cảnh cáo",
      "3 lần vi phạm trong 30 ngày: Tạm khóa tài khoản 7 ngày",
      "5 lần vi phạm: Đình chỉ hợp tác vĩnh viễn",
    ]
  },
  {
    id: "documents",
    icon: FileText,
    title: "Giấy tờ bắt buộc",
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    rules: [
      "CCCD/CMND còn hạn sử dụng (cả 2 mặt) - BẮT BUỘC",
      "Ảnh chân dung cầm CCCD (Selfie) để xác minh danh tính - BẮT BUỘC",
      "Lý lịch tư pháp hoặc Giấy xác nhận hạnh kiểm (mẫu số 1 hoặc 2) - BẮT BUỘC",
      "Giấy khám sức khỏe (cấp quận/huyện trở lên, trong vòng 6 tháng) - Khuyến nghị",
    ]
  },
];

interface TabRulesProps {
  onNext: () => void;
}

export function TabRules({ onNext }: TabRulesProps) {
  const [agreedSections, setAgreedSections] = useState<Set<string>>(new Set());
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const allAgreed = agreedSections.size === RULES_SECTIONS.length;

  const toggleAgree = (id: string) => {
    setAgreedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setScrolledToBottom(true);
    }
  };

  return (
    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pt-10 px-10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ScrollText className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold font-serif text-primary">Nội quy & Quy định</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Vui lòng đọc kỹ và đồng ý với từng mục trước khi tiếp tục</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-10 pb-10">
        {/* Scrollable content */}
        <div
          onScroll={handleScroll}
          className="max-h-[500px] overflow-y-auto space-y-6 pr-2 custom-scrollbar"
        >
          {RULES_SECTIONS.map((section) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border-2 p-6 transition-all duration-300 cursor-pointer",
                agreedSections.has(section.id)
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border/50 bg-background/50 hover:border-primary/30"
              )}
              onClick={() => toggleAgree(section.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", section.bg)}>
                    <section.icon className={cn("w-5 h-5", section.color)} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold">{section.title}</h3>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all",
                  agreedSections.has(section.id) ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30"
                )}>
                  {agreedSections.has(section.id) && <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                </div>
              </div>

              <ul className="space-y-2">
                {section.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <ChevronRight className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-pretty">{rule}</span>
                  </li>
                ))}
              </ul>

              {agreedSections.has(section.id) && (
                <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                  <BadgeCheck className="w-4 h-4" aria-hidden="true" />
                  Đã đồng ý với mục này
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 pt-6 border-t border-border/50">
          {!allAgreed && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-2xl px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Vui lòng đọc và đồng ý với tất cả {RULES_SECTIONS.length} mục quy định để tiếp tục ({agreedSections.size}/{RULES_SECTIONS.length})</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={onNext}
              disabled={!allAgreed}
              className="h-14 px-10 rounded-full text-lg font-bold shadow-lg shadow-primary/20 disabled:opacity-40"
            >
              Tôi đã đọc & đồng ý — Tiếp tục
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
