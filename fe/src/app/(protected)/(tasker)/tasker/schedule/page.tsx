'use client';

import { Calendar, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskerSidebar } from '@/features/tasker/_components/TaskerSidebar';

export default function TaskerSchedulePage() {
  return (
    <div className="flex min-h-screen bg-background">
      <TaskerSidebar />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-5 md:p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-serif)' }}>
              Lịch <span className="italic text-primary">làm việc</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Quản lý thời gian và sự sẵn sàng nhận đơn.</p>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-lg">Quản lý lịch làm việc</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Tính năng quản lý lịch theo tuần, đặt thời gian sẵn sàng và nhận đơn đang được phát triển.
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
