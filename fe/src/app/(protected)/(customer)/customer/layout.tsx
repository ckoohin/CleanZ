"use client"

import React from 'react'
import { Header } from '@/components/layouts/customer/header/Header'
import Footer from '@/components/layouts/site/footer/Footer'
import { BottomNav } from '@/features/customer/_components/BottomNav'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { CustomerSidebar } from '@/components/layouts/customer/sidebar/CustomerSidebar'
import { AvatarProfile } from '@/components/layouts/site/header/AvatarProfile'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function CustomerLayout({
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <SidebarProvider>
            {/* Desktop Sidebar (ẩn trên mobile) */}
            <CustomerSidebar />

            <SidebarInset className="bg-background flex flex-col flex-1 min-w-0">
                {/* Mobile Header (chỉ hiện trên mobile) */}
                <div className="md:hidden block">
                    <Header />
                </div>

                {/* Desktop Header mỏng nhẹ (chỉ hiện trên desktop) */}
                <header className="hidden md:flex h-16 shrink-0 items-center justify-end gap-2 px-6 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <AvatarProfile />
                    </div>
                </header>

                <main className="flex-1 pb-24 md:pb-12 animate-in fade-in duration-500">
                    {children}
                </main>

                {/* Bottom Navigation dành cho Mobile kiểu Grab */}
                <BottomNav />

                {/* Footer chỉ hiển thị trên Desktop */}
                <div className="hidden md:block">
                    <Footer/>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
