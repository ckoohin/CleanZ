"use client";

// import RoleGuard from '@/features/auth/_components/authv1/RoleGuard'; // TẮT TẠM - bypass auth để check UI
import React from 'react';

export default function TaskerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // [TẮT TẠM] RoleGuard bị tắt để kiểm tra UI - bật lại khi cần
        // <RoleGuard allowedRoles={['CUSTOMER', 'TASKER']}>
        <div className="min-h-screen bg-background">
            {children}
        </div>
        // </RoleGuard>
    );
}
