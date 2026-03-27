import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HeaderAction } from "./nav.config";
import { cn } from "@/lib/utils";

interface HeaderActionsProps {
  actions: HeaderAction[];
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({ actions }) => {
  return (
    <>
      {actions.map((action, i) => {
        if (action.type === "icon" && action.icon) {
          const Icon = action.icon;
          return (
            <Button
              key={i}
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Icon className="w-4 h-4" />
              {/* badge */}
              {action.badge != null && action.badge > 0 && (
                <span className={cn(
                  "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1",
                  "flex items-center justify-center",
                  "bg-primary text-primary-foreground rounded-full",
                  "text-[9px] font-black leading-none"
                )}>
                  {action.badge > 9 ? "9+" : action.badge}
                </span>
              )}
            </Button>
          );
        }

        if (action.type === "button" && action.label) {
          return action.href ? (
            <Link key={i} href={action.href}>
              <Button size="sm" variant="outline" className="font-semibold">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button key={i} size="sm" variant="outline" className="font-semibold" onClick={action.onClick}>
              {action.label}
            </Button>
          );
        }
        return null;
      })}
    </>
  );
};