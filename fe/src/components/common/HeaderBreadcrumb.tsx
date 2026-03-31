"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { sidebarSections } from "@/components/layouts/admin/sideber/sidebar.config";

export default function HeaderBreadcrumb() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  const getLabel = (path: string, segment: string) => {
    for (const section of sidebarSections) {
      const item = section.items.find((i: any) => i.href === path);
      if (item) return item.label;
    }

    // nếu là id
    if (!isNaN(Number(segment))) {
      return "Chi tiết";
    }

    return segment;
  };

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-5">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition"
      >
        <Home className="size-4" />
        <span className="hidden sm:inline">Trang chủ</span>
      </Link>

      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = getLabel(href, segment);
        const isLast = index === segments.length - 1;

        return (
          <div key={href} className="flex items-center">
            <ChevronRight className="mx-2 size-4 opacity-50" />

            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}