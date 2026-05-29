'use client';

import { DollarSign, TrendingUp, Clock } from 'lucide-react';
import { StaffSidebar } from '@/features/staff/_components/StaffSidebar';

export default function StaffEarningsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <StaffSidebar />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-5 md:p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-serif)' }}>
              Thu <span className="italic text-primary">nhập</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Theo dõi doanh thu và lịch sử thanh toán.</p>
          </div>

          {/* Placeholder stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: DollarSign, label: 'Tháng này', value: '—', color: 'bg-emerald-500/10 text-emerald-600' },
              { icon: TrendingUp, label: 'Tổng tích lũy', value: '—', color: 'bg-primary/10 text-primary' },
              { icon: Clock, label: 'Đang xử lý', value: '—', color: 'bg-yellow-500/10 text-yellow-600' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-black">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-lg">Lịch sử thu nhập</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Báo cáo thu nhập chi tiết, lịch sử rút tiền và thống kê theo tháng đang được phát triển.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Clock className="w-3 h-3" aria-hidden="true" /> Sắp ra mắt
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
