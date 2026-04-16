"use client"

import React from 'react'
import { Header } from '@/components/layouts/customer/header/Header'
import Footer from '@/components/layouts/site/footer/Footer'
import { BottomNav } from '@/features/customer/_components/BottomNav'

export default function CustomerLayout({
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="min-h-screen bg-background flex flex-col relative">
            {/* Header kiểu App (Sticky) */}
            <Header />

            <main className="flex-1 pb-24 md:pb-12 animate-in fade-in duration-500">
                {children}
            </main>

            {/* Bottom Navigation dành cho Mobile kiểu Grab */}
            <BottomNav />

            {/* Footer chỉ hiển thị trên Desktop hoặc các trang dài */}
            <div className="hidden md:block">
              <Footer/>
            </div>
        </div>
    )
}