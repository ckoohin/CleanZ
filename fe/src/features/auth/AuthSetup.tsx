'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { setOnUnauthenticated } from '@/lib/api/http';
import { queryKeys } from '@/features/auth/queries/auth.query';

const PROTECTED_PREFIXES = ['/admin', '/tasker', '/customer'];

// Chọn đúng cổng đăng nhập theo vùng đang đứng (khớp với logic của RoleGuard),
// tránh đẩy admin/tasker về trang đăng nhập của khách hàng.
function resolveLoginPath(pathname: string): string {
  if (pathname.startsWith('/admin')) return '/login-admin';
  if (pathname.startsWith('/tasker')) return '/login-tasker';
  return '/login';
}

/**
* Đăng ký trình xử lý lỗi 401 toàn cục.
*
* Trên các tuyến đường được bảo vệ: xóa cache xác thực và chuyển hướng đến đúng
* trang đăng nhập theo vai trò. Trên tuyến công khai: không làm gì.
*
* Không hiển thị gì; phải nằm bên trong QueryClientProvider.
*/
export function AuthSetup() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  // Cờ một-lần: queryClient.clear() khiến useAuth refetch /auth/me, có thể 401
  // lại và gọi handler thêm lần nữa trong lúc đang điều hướng → vòng lặp. Cờ này
  // đảm bảo chỉ xử lý/redirect đúng một lần cho mỗi lần mất phiên.
  const redirectingRef = useRef(false);

  // Khi đã rời khỏi vùng bảo vệ (vd về trang đăng nhập), mở khoá lại để phiên
  // đăng nhập kế tiếp vẫn được bảo vệ bình thường.
  useEffect(() => {
    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );
    if (!isProtected) redirectingRef.current = false;
  }, [pathname]);

  useEffect(() => {
    const handler = () => {
      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
      );
      if (!isProtected || redirectingRef.current) return;

      redirectingRef.current = true;
      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
      queryClient.clear();
      router.replace(resolveLoginPath(pathname));
    };
    setOnUnauthenticated(handler);
    return () => setOnUnauthenticated(null);
  }, [queryClient, router, pathname]);

  return null;
}
