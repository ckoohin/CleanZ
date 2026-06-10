import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export const StepSuccess: React.FC = () => {
  return (
    <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-md rounded-[3rem] overflow-hidden text-center">
      <CardContent className="p-16">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(255,160,0,0.4)]"
        >
          <CheckCircle className="w-12 h-12 text-primary-foreground" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-4xl font-bold font-serif mb-6">Đã nhận hồ sơ!</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Chúc mừng bạn đã hoàn thành đăng ký trở thành đối tác của <span className="text-primary font-bold">CleanZ</span>. 
            Hồ sơ của bạn đang được ban quản trị xét duyệt (thường mất từ 24h - 48h làm việc).
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="p-6 rounded-[2rem] bg-background/50 border border-border/50">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm font-bold">Xét duyệt hồ sơ</p>
            <p className="text-xs text-muted-foreground mt-1">24h - 48h</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-background/50 border border-border/50">
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm font-bold">Phỏng vấn online</p>
            <p className="text-xs text-muted-foreground mt-1">Qua điện thoại</p>
          </div>
          <div className="p-6 rounded-[2rem] bg-background/50 border border-border/50">
            <ArrowRight className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm font-bold">Bắt đầu nhận việc</p>
            <p className="text-xs text-muted-foreground mt-1">Ngay khi được duyệt</p>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg" variant="outline" className="h-14 px-10 rounded-full text-lg font-bold w-full md:w-auto">
              Về trang chủ
            </Button>
          </Link>
          <Link href="/tasker">
            <Button size="lg" className="h-14 px-10 rounded-full text-lg font-bold w-full md:w-auto shadow-lg shadow-primary/20">
              Vào Khu vực đối tác
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
