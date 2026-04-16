"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLink } from "./nav.config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HeaderNavProps {
  navLinks: NavLink[];
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ navLinks }) => {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
      {navLinks.map((link, index) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Button
            key={index}
            variant={"ghost"}
            size={"sm"}
            className={cn(
              "relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300",
              "hover:text-primary hover:bg-primary/5",
              isActive
                ? "text-primary bg-primary/5 shadow-sm"
                : "text-muted-foreground"
            )}>
            <Link
              key={link.label}
              href={link.href}
            >
              {link.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
};