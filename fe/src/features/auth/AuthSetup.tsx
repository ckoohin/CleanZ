'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { setOnUnauthenticated } from '@/lib/api/http';
import { queryKeys } from '@/features/auth/queries/auth.query';

const PROTECTED_PREFIXES = ['/admin', '/tasker'];

/**
* Đăng ký trình xử lý lỗi 401 toàn cục.

* Trên các tuyến đường được bảo vệ: xóa bộ nhớ cache xác thực và chuyển hướng đến /login.

* Trên các tuyến đường công khai: không làm gì (cho phép xử lý lỗi truy vấn thông thường hoạt động).

* Không hiển thị gì; phải nằm bên trong QueryClientProvider.

*/
export function AuthSetup() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => {
      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
      );

      if (isProtected) {
        queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
        queryClient.clear();
        router.push('/login');
      }
      // Trên các tuyến đường công khai, không làm gì cả – hãy để useAuth() trả về lỗi bình thường
    };
    setOnUnauthenticated(handler);
    return () => setOnUnauthenticated(null);
  }, [queryClient, router, pathname]);

  return null;
}
