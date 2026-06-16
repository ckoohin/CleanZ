"use client"

import { Settings2Icon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Settings2Icon import kept here for external consumers that may reference it
export { Settings2Icon }

export function NavProjects({
  projects,
  label,
}: {
  projects: {
    name: string
    url: string
    icon: React.ReactNode
  }[]
  label?: string
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 mb-1 px-2">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {projects.map((item) => {
          const isActive =
            pathname === item.url || pathname.startsWith(item.url + "/")
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                tooltip={item.name}
                isActive={isActive}
                className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-muted/50 transition-colors"
              >
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
