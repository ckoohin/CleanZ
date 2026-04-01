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
              "relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150",
              "hover:text-foreground hover:bg-muted/60",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}>
            <Link
              key={link.label}
              href={link.href}
              
            >
              {link.label}
              {/* active underline */}
              {isActive && (
                <span className="absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
};