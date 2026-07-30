"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface MobileViewportPortalProps {
  children: ReactNode;
}

/**
 * Đưa UI fixed của mobile ra thẳng document.body.
 *
 * Các layout có animation/transform sẽ trở thành containing block của phần tử
 * `position: fixed`, khiến bottom navigation bám theo chiều cao nội dung thay vì
 * viewport đang hiển thị. Portal giữ navigation ngoài các layout đó để browser
 * tự cập nhật vị trí khi thanh công cụ mobile hiện hoặc ẩn.
 */
export function MobileViewportPortal({
  children,
}: MobileViewportPortalProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setTarget(document.body), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return target ? createPortal(children, target) : null;
}
