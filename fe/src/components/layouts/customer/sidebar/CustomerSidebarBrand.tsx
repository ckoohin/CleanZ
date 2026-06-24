"use client"

import { useSidebar } from "@/components/ui/sidebar"
import LogoApp from "@/components/logo/LogoApp"
import { cn } from "@/lib/utils"

export function CustomerSidebarBrand() {
  const { state } = useSidebar()

  return (
    <div className={cn("flex items-center w-full", state === "collapsed" ? "justify-center px-0" : "px-2 py-1")}>
      <LogoApp
        href="/customer"
        variant={state === "collapsed" ? "icon-only" : "default"}
        size="md"
        textClassName="text-sidebar-foreground drop-shadow-sm"
      />
    </div>
  )
}
