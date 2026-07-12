import { Suspense } from "react";
import { AdminBookingPage } from "@/features/admin/modules/booking/_components/AdminBookingPage";

export default function BookingsPage() {
  // AdminBookingPage dùng useSearchParams() để nhận sẵn bộ lọc từ URL (dashboard
  // link sang kèm ?status=… / ?keyword=…). Next bắt buộc phải có Suspense bao
  // ngoài, không thì chặn ngay lúc build.
  return (
    <Suspense>
      <AdminBookingPage />
    </Suspense>
  );
}
