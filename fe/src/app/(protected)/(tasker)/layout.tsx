"use client";

import RoleGuard from '@/features/auth/_components/authv1/RoleGuard';
import React from 'react';

export default function TaskerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // Cho phép CUSTOMER (đang onboarding) và TASKER (đã được duyệt)
        <RoleGuard allowedRoles={['CUSTOMER', 'TASKER']}>
            <div className="min-h-screen bg-background">
                {children}
            </div>
        </RoleGuard>
    );
}
