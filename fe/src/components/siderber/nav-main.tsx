"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  label?: string
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70 mb-2 px-2">{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isGroupActive = item.url === pathname || item.items?.some((subItem) => pathname === subItem.url) || item.isActive
          
          return (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={isGroupActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              {item.items && item.items.length > 0 ? (
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={isGroupActive} className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary">
                    {item.icon}
                    <span className="font-medium">{item.title}</span>
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              ) : (
                <SidebarMenuButton tooltip={item.title} isActive={isGroupActive} className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary" asChild>
                  <Link href={item.url}>
                    {item.icon}
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
              {item.items && item.items.length > 0 && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={pathname === subItem.url} className="hover:text-primary">
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        )})}
      </SidebarMenu>
    </SidebarGroup>
  )
}
