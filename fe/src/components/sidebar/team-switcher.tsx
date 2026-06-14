"use client"

import { useSidebar } from "@/components/ui/sidebar"
import LogoApp from "../logo/LogoApp"

export function SidebarBrand() {
  const { state } = useSidebar()

  return (
    <div className="flex items-center px-2 py-1">
      <LogoApp
        href="/admin"
        variant={state === "collapsed" ? "icon-only" : "default"}
        size="sm"
      />
    </div>
  )
}
