"use client"

import React from 'react'
import { Header } from '@/components/layouts/customer/header/Header'
import Footer from '@/components/layouts/site/footer/Footer'
import { BottomNav } from '@/features/customer/_components/BottomNav'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { CustomerSidebar } from '@/components/layouts/customer/sidebar/CustomerSidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AvatarProfile } from '@/components/layouts/site/header/AvatarProfile'
import { ActiveBookingWidget } from '@/features/booking/components/ActiveBookingWidget'

const CUSTOMER_NAV_LINKS = [
  { label: "Trang chủ",   href: "/customer" },
  { label: "Về CleanZ",   href: "/about" },
  { label: "Dịch vụ",     href: "/services" },
  { label: "Trợ giúp",    href: "/support" },
];

export default function CustomerLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <SidebarProvider>
                {/* Desktop Sidebar (ẩn trên mobile) */}
                <CustomerSidebar />

                <SidebarInset className="bg-background flex flex-col flex-1 min-w-0 min-h-screen">
                    {/* Mobile Header (chỉ hiện trên mobile) */}
                    <div className="md:hidden block">
                        <Header navLinks={CUSTOMER_NAV_LINKS} />
                    </div>

                    {/* Desktop Header mỏng nhẹ (chỉ hiện trên desktop) */}
                    <header className="hidden md:flex h-16 shrink-0 items-center justify-end gap-2 px-6 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40">
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <AvatarProfile />
                        </div>
                    </header>

                    {/* Main content */}
                    <main className="flex-1 pb-24 md:pb-12 animate-in fade-in duration-500">
                        {children}
                    </main>

                    {/* Bottom Navigation dành cho Mobile */}
                    <BottomNav />

                    {/* Widget theo dõi đơn hàng hoạt động */}
                    <ActiveBookingWidget />
                </SidebarInset>
            </SidebarProvider>

            {/* Footer full-width — ngoài SidebarInset để không bị thụt vào */}
            <div className="hidden md:block">
                <Footer />
            </div>
        </div>
    )
}
