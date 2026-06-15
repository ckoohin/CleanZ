"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth, useLogout } from "@/features/auth/hooks/auth.hooks"
import { ChevronsUpDownIcon, KeyRoundIcon, LogOutIcon } from "lucide-react"
import Link from "next/link"
import ConfirmDialog from "../common/ConfirmDialog"

function getInitials(name: string = "Admin"): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function NavUserSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5 animate-pulse">
      <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 rounded-md bg-muted" />
        <div className="h-2.5 w-32 rounded-md bg-muted" />
      </div>
    </div>
  )
}

type User = { name: string; email: string; avatar: string; fullName: string }

export function NavUser({
  user
}: {
  user?:  User
}) {
  const { isMobile } = useSidebar()
  const { data: data, isLoading } = useAuth()
  const logout = useLogout()

  if (isLoading) return <NavUserSkeleton />
  if (!user) return null

  const initials = getInitials(user.fullName)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                <AvatarImage src={user.avatar ?? undefined} alt={user.fullName} />
                <AvatarFallback className="rounded-lg text-xs font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.fullName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarImage src={user.avatar ?? undefined} alt={user.fullName} />
                  <AvatarFallback className="rounded-lg text-xs font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/forgot-password">
                <KeyRoundIcon className="mr-2 h-4 w-4" />
                Đổi mật khẩu
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              }
              title="Xác nhận đăng xuất"
              description="Bạn có chắc chắn muốn đăng xuất?"
              confirmText="Đăng xuất"
              cancelText="Hủy"
              onConfirm={() => logout.mutate()}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
