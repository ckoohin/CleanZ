"use client";

import RoleGuard from '@/features/auth/_components/authv1/RoleGuard';
import React from 'react';

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // Cho phép CUSTOMER (đang onboarding) và STAFF (đã được duyệt)
        <RoleGuard allowedRoles={['CUSTOMER', 'STAFF']}>
            <div className="min-h-screen bg-background">
                {children}
            </div>
        </RoleGuard>
    );
}
