import React from 'react'
import {
    LayoutDashboard,
    Utensils,
    Table,
    Users,
    BarChart3,
    ReceiptText,
    Settings,
} from "lucide-react";
import HeaderBreadcrumb from '@/components/common/HeaderBreadcrumb';
import LogoAdmin from '@/components/logo/LogoAdmin';
const Header = () => {
    return (
        <>
            <header className="sticky top-0 z-50 bg-[var(--background)]/90 backdrop-blur-md border-b border-gray-100">
                <h2>Header</h2>
            </header>
        </>
    )
}

export default Header